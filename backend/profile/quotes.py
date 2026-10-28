import json
import os
import re

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
COLS = "id, quote, book, author, published, created_at"


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def to_item(r) -> dict:
    return {"id": r[0], "quote": r[1], "book": r[2], "author": r[3], "published": bool(r[4]), "createdAt": r[5].isoformat()}


def handle_quotes(event: dict) -> dict:
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
            limit = 500 if all_ else 100
            cur.execute(f"SELECT {COLS} FROM {SCHEMA}.book_quotes {cond} ORDER BY created_at DESC, id DESC LIMIT {limit}")
            return resp(200, {"items": [to_item(r) for r in cur.fetchall()]})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "save":
            quote = str(body.get("quote", "")).strip()[:1000]
            book = re.sub(r"\s+", " ", str(body.get("book", ""))).strip()[:200]
            author = re.sub(r"\s+", " ", str(body.get("author", ""))).strip()[:150]
            published = "TRUE" if body.get("published", True) else "FALSE"
            if len(quote) < 5:
                return resp(400, {"error": "Цитата — минимум 5 символов"})
            qid = int(body.get("id", 0) or 0)
            if qid:
                cur.execute(
                    f"UPDATE {SCHEMA}.book_quotes SET quote = '{esc(quote)}', book = '{esc(book)}', author = '{esc(author)}', "
                    f"published = {published} WHERE id = {qid} RETURNING {COLS}"
                )
            else:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.book_quotes (quote, book, author, published) "
                    f"VALUES ('{esc(quote)}', '{esc(book)}', '{esc(author)}', {published}) RETURNING {COLS}"
                )
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Цитата не найдена"})
            return resp(200, {"item": to_item(r)})

        if action == "delete":
            qid = int(body.get("id", 0) or 0)
            cur.execute(f"DELETE FROM {SCHEMA}.book_quotes WHERE id = {qid}")
            return resp(200, {"deleted": qid})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
