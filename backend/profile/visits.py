import json
import os
import re

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
BOT_RE = re.compile(r"bot|crawl|spider|slurp|preview|headless|lighthouse|monitor", re.I)


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def ref_host(ref: str) -> str:
    m = re.match(r"^https?://([^/:?#]+)", ref or "")
    host = (m.group(1) if m else "").lower()
    return host[4:] if host.startswith("www.") else host


def handle_visits(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        uid, is_admin = None, False
        if token:
            cur.execute(
                f"SELECT u.id, u.is_admin FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = '{token}' AND s.expires_at > NOW()"
            )
            r = cur.fetchone()
            if r:
                uid, is_admin = int(r[0]), bool(r[1])

        if method == "POST":
            if BOT_RE.search(headers.get("user-agent", "")):
                return resp(200, {"ok": True})
            body = json.loads(event.get("body") or "{}")
            vid = re.sub(r"[^a-zA-Z0-9-]", "", str(body.get("vid", "")))[:40]
            if len(vid) < 8:
                return resp(400, {"error": "Нет идентификатора"})
            path = re.sub(r"[^\w/\-.?=&%]", "", str(body.get("path", "/")))[:200] or "/"
            host = ref_host(str(body.get("ref", "")))
            own = host.endswith("traderka.ru") or host.endswith("poehali.dev") or host == ""
            ref = "" if own else host[:200]
            device = "mobile" if body.get("mobile") else "desktop"
            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.site_visits WHERE visitor_id = '{vid}' AND created_at > NOW() - INTERVAL '30 minutes' AND path = '{esc(path)}'"
            )
            if int(cur.fetchone()[0]) > 0:
                return resp(200, {"ok": True})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.site_visits WHERE visitor_id = '{vid}' LIMIT 1")
            is_new = cur.fetchone() is None
            cur.execute(
                f"INSERT INTO {SCHEMA}.site_visits (visitor_id, user_id, path, referrer, device, is_new) "
                f"VALUES ('{vid}', {uid if uid else 'NULL'}, '{esc(path)}', '{esc(ref)}', '{device}', {'TRUE' if is_new else 'FALSE'})"
            )
            return resp(200, {"ok": True})

        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})
        days = min(max(int(qs.get("days") or 30), 1), 365)

        def one(sql: str):
            cur.execute(sql)
            return cur.fetchone()

        t = f"{SCHEMA}.site_visits"
        summary = {}
        for key, cond in (("today", "created_at >= CURRENT_DATE"), ("yesterday", "created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE"),
                          ("week", "created_at >= CURRENT_DATE - 6"), ("month", "created_at >= CURRENT_DATE - 29"), ("total", "TRUE")):
            r = one(f"SELECT COUNT(DISTINCT visitor_id), COUNT(*), COUNT(*) FILTER (WHERE is_new) FROM {t} WHERE {cond}")
            summary[key] = {"visitors": int(r[0]), "views": int(r[1]), "newVisitors": int(r[2])}
        online = int(one(f"SELECT COUNT(DISTINCT visitor_id) FROM {t} WHERE created_at > NOW() - INTERVAL '5 minutes'")[0])

        cur.execute(
            f"SELECT d::date, COALESCE(v.visitors, 0), COALESCE(v.views, 0), COALESCE(v.fresh, 0) "
            f"FROM generate_series(CURRENT_DATE - {days - 1}, CURRENT_DATE, INTERVAL '1 day') d "
            f"LEFT JOIN (SELECT created_at::date day, COUNT(DISTINCT visitor_id) visitors, COUNT(*) views, COUNT(*) FILTER (WHERE is_new) fresh "
            f"FROM {t} WHERE created_at >= CURRENT_DATE - {days - 1} GROUP BY 1) v ON v.day = d::date ORDER BY 1"
        )
        daily = [{"day": x[0].isoformat(), "visitors": int(x[1]), "views": int(x[2]), "newVisitors": int(x[3])} for x in cur.fetchall()]

        since = f"created_at >= CURRENT_DATE - {days - 1}"
        cur.execute(f"SELECT path, COUNT(*) FROM {t} WHERE {since} GROUP BY 1 ORDER BY 2 DESC LIMIT 10")
        pages = [{"name": x[0], "count": int(x[1])} for x in cur.fetchall()]
        cur.execute(f"SELECT referrer, COUNT(DISTINCT visitor_id) FROM {t} WHERE {since} AND referrer <> '' GROUP BY 1 ORDER BY 2 DESC LIMIT 10")
        refs = [{"name": x[0], "count": int(x[1])} for x in cur.fetchall()]
        cur.execute(f"SELECT device, COUNT(DISTINCT visitor_id) FROM {t} WHERE {since} GROUP BY 1")
        devices = {x[0]: int(x[1]) for x in cur.fetchall()}
        r = one(f"SELECT COUNT(DISTINCT visitor_id) FILTER (WHERE user_id IS NOT NULL), COUNT(DISTINCT visitor_id) FILTER (WHERE user_id IS NULL) FROM {t} WHERE {since}")
        return resp(200, {
            "online": online, "summary": summary, "daily": daily, "pages": pages, "referrers": refs,
            "devices": {"desktop": devices.get("desktop", 0), "mobile": devices.get("mobile", 0)},
            "members": int(r[0]), "guests": int(r[1]), "days": days,
        })
    finally:
        cur.close()
        conn.close()
