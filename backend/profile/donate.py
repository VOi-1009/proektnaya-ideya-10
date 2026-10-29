import json
import os
import re

import psycopg2

from supporters import grant_supporter
from users import display_name

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
DEFAULT = {"enabled": True, "buttonText": "поддержать проект", "title": "", "text": "", "url": "", "details": ""}


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def handle_donate(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        me, is_admin = None, False
        if token:
            cur.execute(
                f"SELECT u.id, u.is_admin FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = '{token}' AND s.expires_at > NOW()"
            )
            r = cur.fetchone()
            if r:
                me, is_admin = int(r[0]), bool(r[1])
        qs = event.get("queryStringParameters") or {}

        if method == "GET" and qs.get("requests") == "1":
            if not is_admin:
                return resp(403, {"error": "Доступ только для администратора"})
            cur.execute(
                f"SELECT d.id, d.amount, d.comment, d.status, d.created_at, d.decided_at, u.id, u.name, u.email, u.avatar_url, u.supporter_no, u.promo_code "
                f"FROM {SCHEMA}.donation_requests d JOIN {SCHEMA}.users u ON u.id = d.user_id "
                f"ORDER BY (d.status = 'pending') DESC, d.id DESC LIMIT 200"
            )
            items = [{
                "id": x[0], "amount": x[1], "comment": x[2], "status": x[3], "createdAt": x[4].isoformat(),
                "decidedAt": x[5].isoformat() if x[5] else None,
                "user": {"id": x[6], "name": display_name(x[7], x[8]), "avatar": x[9] or "", "supporter": x[10], "promo": x[11] or ""},
            } for x in cur.fetchall()]
            return resp(200, {"items": items, "pending": sum(1 for i in items if i["status"] == "pending")})

        if method == "GET" and qs.get("mine") == "1":
            if not me:
                return resp(401, {"error": "Войдите в аккаунт"})
            cur.execute(f"SELECT id, amount, status, created_at FROM {SCHEMA}.donation_requests WHERE user_id = {me} ORDER BY id DESC LIMIT 1")
            x = cur.fetchone()
            return resp(200, {"last": {"id": x[0], "amount": x[1], "status": x[2], "createdAt": x[3].isoformat()} if x else None})

        if method == "GET":
            cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'donate'")
            r = cur.fetchone()
            return resp(200, {"donate": {**DEFAULT, **(json.loads(r[0]) if r else {})}})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "request":
            if not me:
                return resp(401, {"error": "Войдите в аккаунт, чтобы отправить заявку"})
            amount = int(re.sub(r"\D", "", str(body.get("amount", "")))[:9] or 0)
            if amount < 1:
                return resp(400, {"error": "Укажите сумму перевода"})
            comment = str(body.get("comment", "")).strip()[:500]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.donation_requests WHERE user_id = {me} AND status = 'pending'")
            if int(cur.fetchone()[0]) >= 3:
                return resp(429, {"error": "У вас уже есть заявки на проверке — дождитесь подтверждения"})
            cur.execute(
                f"INSERT INTO {SCHEMA}.donation_requests (user_id, amount, comment) VALUES ({me}, {amount}, '{esc(comment)}') RETURNING id"
            )
            return resp(200, {"id": cur.fetchone()[0]})

        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})

        if action in ("approve", "reject"):
            rid = int(body.get("id", 0) or 0)
            st = "approved" if action == "approve" else "rejected"
            cur.execute(
                f"UPDATE {SCHEMA}.donation_requests SET status = '{st}', decided_at = NOW() WHERE id = {rid} AND status = 'pending' RETURNING user_id"
            )
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Заявка не найдена или уже обработана"})
            promo = ""
            if st == "approved":
                grant_supporter(cur, SCHEMA, int(r[0]))
                cur.execute(f"SELECT promo_code FROM {SCHEMA}.users WHERE id = {int(r[0])}")
                promo = cur.fetchone()[0] or ""
            return resp(200, {"status": st, "promo": promo})

        url = str(body.get("url", "")).strip()[:1000]
        if url and not url.startswith("https://"):
            return resp(400, {"error": "Ссылка должна начинаться с https://"})
        data = {
            "enabled": bool(body.get("enabled", True)),
            "buttonText": str(body.get("buttonText", "")).strip()[:40] or DEFAULT["buttonText"],
            "title": str(body.get("title", "")).strip()[:150],
            "text": str(body.get("text", "")).strip()[:1500],
            "url": url,
            "details": str(body.get("details", "")).strip()[:1000],
        }
        val = esc(json.dumps(data, ensure_ascii=False))
        cur.execute(
            f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('donate', '{val}', NOW()) "
            f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
        )
        return resp(200, {"donate": data})
    finally:
        cur.close()
        conn.close()