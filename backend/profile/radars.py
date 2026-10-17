import json
import os
import re

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
COLS = "id, title, color, kind, symbol, url, description, sort_order, published"
KINDS = ("liq_heatmap", "top_txs", "link")
COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
SYMBOL_RE = re.compile(r"^[A-Z0-9]{3,20}$")


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def to_radar(r) -> dict:
    return {"id": r[0], "title": r[1], "color": r[2], "kind": r[3], "symbol": r[4], "url": r[5],
            "description": r[6], "sort": r[7], "published": bool(r[8])}


def handle_radars(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        is_admin = False
        if token:
            cur.execute(
                f"SELECT u.is_admin FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = '{token}' AND s.expires_at > NOW()"
            )
            r = cur.fetchone()
            is_admin = bool(r and r[0])

        if method == "GET":
            all_ = qs.get("admin") == "1"
            if all_ and not is_admin:
                return resp(403, {"error": "Доступ только для администратора"})
            cond = "" if all_ else "WHERE published"
            cur.execute(f"SELECT {COLS} FROM {SCHEMA}.radars {cond} ORDER BY sort_order, id")
            return resp(200, {"radars": [to_radar(r) for r in cur.fetchall()]})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "save":
            rid = int(body.get("id", 0) or 0)
            title = re.sub(r"\s+", "-", str(body.get("title", "")).strip())[:80]
            color = str(body.get("color", "#22d3ee"))
            kind = str(body.get("kind", "liq_heatmap"))
            symbol = str(body.get("symbol", "BTCUSDT")).strip().upper()
            url = str(body.get("url", "")).strip()[:1000]
            desc = str(body.get("description", "")).strip()[:500]
            published = "TRUE" if body.get("published", True) else "FALSE"
            if len(title) < 2:
                return resp(400, {"error": "Название — минимум 2 символа"})
            if not COLOR_RE.match(color):
                return resp(400, {"error": "Некорректный цвет"})
            if kind not in KINDS:
                return resp(400, {"error": "Неизвестный тип радара"})
            if kind == "liq_heatmap" and not SYMBOL_RE.match(symbol):
                return resp(400, {"error": "Тикер вида BTCUSDT"})
            if kind == "link" and not url.startswith("https://"):
                return resp(400, {"error": "Ссылка должна начинаться с https://"})
            vals = f"title = '{esc(title)}', color = '{color}', kind = '{kind}', symbol = '{esc(symbol)}', url = '{esc(url)}', description = '{esc(desc)}', published = {published}"
            if rid:
                cur.execute(f"UPDATE {SCHEMA}.radars SET {vals} WHERE id = {rid} RETURNING {COLS}")
            else:
                cur.execute(f"SELECT COALESCE(MAX(sort_order), -1) + 1 FROM {SCHEMA}.radars")
                nxt = cur.fetchone()[0]
                cur.execute(
                    f"INSERT INTO {SCHEMA}.radars (title, color, kind, symbol, url, description, published, sort_order) "
                    f"VALUES ('{esc(title)}', '{color}', '{kind}', '{esc(symbol)}', '{esc(url)}', '{esc(desc)}', {published}, {nxt}) RETURNING {COLS}"
                )
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Радар не найден"})
            return resp(200, {"radar": to_radar(r)})

        if action == "move":
            rid = int(body.get("id", 0) or 0)
            d = -1 if int(body.get("dir", 1)) < 0 else 1
            cur.execute(f"SELECT id FROM {SCHEMA}.radars ORDER BY sort_order, id")
            ids = [x[0] for x in cur.fetchall()]
            if rid in ids:
                i = ids.index(rid)
                j = i + d
                if 0 <= j < len(ids):
                    ids[i], ids[j] = ids[j], ids[i]
                for pos, x in enumerate(ids):
                    cur.execute(f"UPDATE {SCHEMA}.radars SET sort_order = {pos} WHERE id = {x}")
            cur.execute(f"SELECT {COLS} FROM {SCHEMA}.radars ORDER BY sort_order, id")
            return resp(200, {"radars": [to_radar(r) for r in cur.fetchall()]})

        if action == "delete":
            rid = int(body.get("id", 0) or 0)
            cur.execute(f"DELETE FROM {SCHEMA}.radars WHERE id = {rid}")
            return resp(200, {"deleted": rid})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
