import json
import os
import re

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
DEFAULT = {"enabled": True, "buttonText": "Поддержать проект", "title": "", "text": "", "url": "", "details": ""}


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
        if method == "GET":
            cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'donate'")
            r = cur.fetchone()
            return resp(200, {"donate": {**DEFAULT, **(json.loads(r[0]) if r else {})}})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        is_admin = False
        if token:
            cur.execute(
                f"SELECT u.is_admin FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = '{token}' AND s.expires_at > NOW()"
            )
            r = cur.fetchone()
            is_admin = bool(r and r[0])
        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})

        body = json.loads(event.get("body") or "{}")
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
