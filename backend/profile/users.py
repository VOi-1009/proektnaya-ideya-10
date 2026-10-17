import json
import os
import re

import psycopg2

from status import MAX_LEVEL, TITLES, level_for, points_sql

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
ONLINE_MINUTES = 5


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def display_name(name, email) -> str:
    if name:
        return name
    email = email or ""
    if email.endswith("@users.traderka.ru") or not email:
        return "Трейдер"
    return email.split("@")[0]


def handle_users(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}

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

        pts = points_sql(SCHEMA)
        base = f"SELECT u.id, u.name, u.email, {pts}, u.status_override, u.last_seen_at, u.created_at FROM {SCHEMA}.users u"

        def to_user(r, full=False) -> dict:
            st = level_for(int(r[3]), r[4])
            u = {"id": r[0], "name": display_name(r[1], r[2]), "level": st["level"], "title": st["title"]}
            if full:
                email = r[2] or ""
                u.update({
                    "email": "" if email.endswith("@users.traderka.ru") else email,
                    "points": st["points"],
                    "manual": st["manual"],
                    "lastSeen": r[5].isoformat() if r[5] else None,
                    "createdAt": r[6].isoformat(),
                })
            return u

        if method == "GET":
            if qs.get("admin") == "1":
                if not is_admin:
                    return resp(403, {"error": "Доступ только для администратора"})
                cur.execute(f"{base} ORDER BY u.created_at DESC LIMIT 500")
                users = [to_user(r, True) for r in cur.fetchall()]
                return resp(200, {"users": users, "titles": TITLES})

            if me:
                cur.execute(f"UPDATE {SCHEMA}.users SET last_seen_at = NOW() WHERE id = {me}")
            cur.execute(
                f"SELECT * FROM ({base} WHERE u.last_seen_at > NOW() - INTERVAL '{ONLINE_MINUTES} minutes') t "
                f"ORDER BY COALESCE(t.status_override, 0) DESC LIMIT 200"
            )
            users = [to_user(r) for r in cur.fetchall()]
            users.sort(key=lambda u: (-u["level"], u["name"].lower()))
            return resp(200, {"online": users[:20], "total": len(users)})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})

        body = json.loads(event.get("body") or "{}")
        if body.get("action") != "set-status":
            return resp(400, {"error": "Неизвестное действие"})
        uid = int(body.get("userId", 0) or 0)
        level = body.get("level")
        if level in (None, "", 0, "auto"):
            val = "NULL"
        else:
            level = int(level)
            if not 1 <= level <= MAX_LEVEL:
                return resp(400, {"error": "Такого статуса нет"})
            val = str(level)
        cur.execute(f"UPDATE {SCHEMA}.users SET status_override = {val} WHERE id = {uid}")
        cur.execute(f"{base} WHERE u.id = {uid}")
        r = cur.fetchone()
        if not r:
            return resp(404, {"error": "Пользователь не найден"})
        return resp(200, {"user": to_user(r, True)})
    finally:
        cur.close()
        conn.close()
