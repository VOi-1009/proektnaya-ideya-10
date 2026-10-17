import hashlib
import json
import os
import re
import secrets

import psycopg2

from status import level_for, points_sql

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
FOUNDERS_LIMIT = 100
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(body, ensure_ascii=False)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${h}"


def check_password(password: str, stored: str) -> bool:
    if not stored or "$" not in stored:
        return False
    salt = stored.split("$", 1)[0]
    return secrets.compare_digest(hash_password(password, salt), stored)


def create_session(cur, user_id: int) -> str:
    token = secrets.token_hex(32)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (token, user_id, expires_at) VALUES ('{token}', {int(user_id)}, NOW() + INTERVAL '30 days')"
    )
    return token


def claim_founder(cur, user_id: int) -> None:
    cur.execute(
        f"UPDATE {SCHEMA}.users SET founder_no = (SELECT COALESCE(MAX(founder_no), 0) + 1 FROM {SCHEMA}.users) "
        f"WHERE id = {int(user_id)} AND founder_no IS NULL AND NOT is_bot "
        f"AND (SELECT COUNT(*) FROM {SCHEMA}.users WHERE founder_no IS NOT NULL) < {FOUNDERS_LIMIT}"
    )


def handler(event: dict, context) -> dict:
    """Регистрация, вход, выход и проверка сессии пользователя по почте и паролю"""
    method = event.get("httpMethod", "GET")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()

    try:
        if method == "GET":
            if not token:
                return resp(401, {"error": "Не авторизован"})
            cur.execute(
                f"SELECT u.id, u.email, u.name, u.avatar_url, u.is_admin, {points_sql(SCHEMA)}, u.status_override, u.founder_no, u.supporter_no, u.is_creator FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = '{token}' AND s.expires_at > NOW()"
            )
            row = cur.fetchone()
            if not row:
                return resp(401, {"error": "Сессия истекла"})
            email = row[1] or ""
            if email.endswith("@users.traderka.ru"):
                email = row[2] or "Яндекс ID"
            if token:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.user_visits (user_id, day) VALUES ({int(row[0])}, CURRENT_DATE) ON CONFLICT DO NOTHING"
                )
                cur.execute(f"UPDATE {SCHEMA}.users SET last_seen_at = NOW() WHERE id = {int(row[0])}")
                if row[7] is None:
                    claim_founder(cur, row[0])
                    cur.execute(f"SELECT founder_no FROM {SCHEMA}.users WHERE id = {int(row[0])}")
                    row = (*row[:7], cur.fetchone()[0], *row[8:])
            st = level_for(int(row[5]), row[6])
            return resp(200, {"user": {"id": row[0], "email": email, "name": row[2] or "", "avatar": row[3] or "", "isAdmin": bool(row[4]), "level": st["level"], "statusTitle": st["title"], "founder": row[7], "supporter": row[8], "creator": bool(row[9])}})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "logout":
            if token:
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = '{token}'")
            return resp(200, {"ok": True})

        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        if not EMAIL_RE.match(email) or len(email) > 255:
            return resp(400, {"error": "Укажите корректную почту"})
        if len(password) < 6:
            return resp(400, {"error": "Пароль должен быть не короче 6 символов"})

        cur.execute(f"SELECT id, password_hash FROM {SCHEMA}.users WHERE email = '{esc(email)}'")
        row = cur.fetchone()

        if action == "register":
            if row and not row[1]:
                return resp(409, {"error": "Эта почта привязана к Яндекс ID — войдите через Яндекс"})
            if row:
                return resp(409, {"error": "Эта почта уже зарегистрирована — войдите"})
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (email, password_hash) VALUES ('{esc(email)}', '{hash_password(password)}') RETURNING id"
            )
            user_id = cur.fetchone()[0]
        elif action == "login":
            if not row or not check_password(password, row[1]):
                return resp(401, {"error": "Неверная почта или пароль"})
            user_id = row[0]
        else:
            return resp(400, {"error": "Неизвестное действие"})

        new_token = create_session(cur, user_id)
        cur.execute(f"UPDATE {SCHEMA}.users SET last_seen_at = NOW() WHERE id = {int(user_id)}")
        claim_founder(cur, user_id)
        cur.execute(f"SELECT u.name, u.avatar_url, u.is_admin, {points_sql(SCHEMA)}, u.status_override, u.founder_no, u.supporter_no, u.is_creator FROM {SCHEMA}.users u WHERE u.id = {int(user_id)}")
        u = cur.fetchone()
        st = level_for(int(u[3]), u[4])
        return resp(200, {"token": new_token, "user": {"id": user_id, "email": email, "name": u[0] or "", "avatar": u[1] or "", "isAdmin": bool(u[2]), "level": st["level"], "statusTitle": st["title"], "founder": u[5], "supporter": u[6], "creator": bool(u[7])}})
    finally:
        cur.close()
        conn.close()