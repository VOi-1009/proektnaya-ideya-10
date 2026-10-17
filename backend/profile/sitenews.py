import json
import os
import re

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
COLS = "id, title, body, published, created_at"


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def to_item(r) -> dict:
    return {"id": r[0], "title": r[1], "body": r[2], "published": bool(r[3]), "createdAt": r[4].isoformat()}


def handle_site_news(event: dict) -> dict:
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
            limit = 200 if all_ else 6
            cur.execute(f"SELECT {COLS} FROM {SCHEMA}.site_news {cond} ORDER BY created_at DESC, id DESC LIMIT {limit}")
            return resp(200, {"items": [to_item(r) for r in cur.fetchall()]})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "save":
            title = re.sub(r"\s+", " ", str(body.get("title", ""))).strip()[:150]
            text = str(body.get("body", "")).strip()[:2000]
            published = "TRUE" if body.get("published", True) else "FALSE"
            if len(title) < 2:
                return resp(400, {"error": "Заголовок — минимум 2 символа"})
            nid = int(body.get("id", 0) or 0)
            if nid:
                cur.execute(
                    f"UPDATE {SCHEMA}.site_news SET title = '{esc(title)}', body = '{esc(text)}', published = {published} "
                    f"WHERE id = {nid} RETURNING {COLS}"
                )
            else:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.site_news (title, body, published) VALUES ('{esc(title)}', '{esc(text)}', {published}) RETURNING {COLS}"
                )
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Новость не найдена"})
            return resp(200, {"item": to_item(r)})

        if action == "delete":
            nid = int(body.get("id", 0) or 0)
            cur.execute(f"DELETE FROM {SCHEMA}.site_news WHERE id = {nid}")
            return resp(200, {"deleted": nid})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
