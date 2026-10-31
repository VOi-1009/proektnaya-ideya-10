import json
import os
import re

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
DEFAULT = {"items": [], "menuTitle": ""}
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def handle_menu(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        if method == "GET":
            cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'menu'")
            r = cur.fetchone()
            return resp(200, {"menu": {**DEFAULT, **(json.loads(r[0]) if r else {})}})

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
        items = []
        for it in (body.get("items") or [])[:120]:
            iid = re.sub(r"[^a-zA-Z0-9_-]", "", str(it.get("id", "")))[:40]
            if not iid:
                continue
            icon = re.sub(r"[^a-zA-Z0-9]", "", str(it.get("icon", "")))[:40]
            color = str(it.get("color", "")).strip()
            items.append({
                "id": iid,
                "label": str(it.get("label", "")).strip()[:60],
                "hidden": bool(it.get("hidden", False)),
                "icon": icon,
                "color": color if HEX.match(color) else "",
            })
        data = {
            "items": items,
            "menuTitle": str(body.get("menuTitle", "")).strip()[:40],
            "v": 2,
        }
        val = esc(json.dumps(data, ensure_ascii=False))
        cur.execute(
            f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('menu', '{val}', NOW()) "
            f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
        )
        return resp(200, {"menu": data})
    finally:
        cur.close()
        conn.close()
