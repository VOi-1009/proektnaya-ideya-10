import base64
import json
import os
import re
import uuid

import boto3
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
COIN_RE = re.compile(r"^[a-z0-9-]{0,64}$")
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

LEVELS = [
    (0, "Новичок"),
    (50, "Наблюдатель"),
    (150, "Трейдер"),
    (350, "Аналитик"),
    (700, "Кит"),
]


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def level_for(points: int) -> dict:
    idx = 0
    for i, (need, _) in enumerate(LEVELS):
        if points >= need:
            idx = i
    nxt = LEVELS[idx + 1] if idx + 1 < len(LEVELS) else None
    return {
        "level": idx + 1,
        "title": LEVELS[idx][1],
        "points": points,
        "current": LEVELS[idx][0],
        "next": nxt[0] if nxt else None,
        "nextTitle": nxt[1] if nxt else None,
    }


def load_profile(cur, user_id: int) -> dict:
    cur.execute(
        f"SELECT u.id, u.email, u.name, u.avatar_url, u.bio, u.city, u.favorite_coin, u.created_at, "
        f"(SELECT COUNT(*) FROM {SCHEMA}.user_visits v WHERE v.user_id = u.id), "
        f"(SELECT COUNT(*) FROM {SCHEMA}.holdings h WHERE h.user_id = u.id) "
        f"FROM {SCHEMA}.users u WHERE u.id = {int(user_id)}"
    )
    r = cur.fetchone()
    email = r[1] or ""
    if email.endswith("@users.traderka.ru"):
        email = ""
    days, coins = int(r[8]), int(r[9])
    filled = sum(1 for v in (r[2], r[3], r[4], r[5], r[6]) if v)
    points = days * 10 + min(coins, 20) * 5 + filled * 6
    return {
        "id": r[0],
        "email": email,
        "name": r[2] or "",
        "avatar": r[3] or "",
        "bio": r[4] or "",
        "city": r[5] or "",
        "favoriteCoin": r[6] or "",
        "createdAt": r[7].isoformat(),
        "stats": {"days": days, "coins": coins, "filled": filled, "fields": 5},
        "status": level_for(points),
    }


def handler(event: dict, context) -> dict:
    """Личный кабинет: профиль, статус по активности, редактирование данных и загрузка аватара"""
    method = event.get("httpMethod", "GET")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    if not token:
        return resp(401, {"error": "Войдите в аккаунт"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = '{token}' AND expires_at > NOW()")
        row = cur.fetchone()
        if not row:
            return resp(401, {"error": "Сессия истекла, войдите снова"})
        user_id = int(row[0])

        if method == "GET":
            cur.execute(
                f"INSERT INTO {SCHEMA}.user_visits (user_id, day) VALUES ({user_id}, CURRENT_DATE) ON CONFLICT DO NOTHING"
            )
            return resp(200, {"profile": load_profile(cur, user_id)})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "update":
            name = str(body.get("name", "")).strip()[:60]
            bio = str(body.get("bio", "")).strip()[:300]
            city = str(body.get("city", "")).strip()[:100]
            coin = str(body.get("favoriteCoin", "")).strip().lower()
            if not COIN_RE.match(coin):
                return resp(400, {"error": "Некорректная монета"})
            cur.execute(
                f"UPDATE {SCHEMA}.users SET name = '{esc(name)}', bio = '{esc(bio)}', city = '{esc(city)}', "
                f"favorite_coin = '{esc(coin)}', updated_at = NOW() WHERE id = {user_id}"
            )
            return resp(200, {"profile": load_profile(cur, user_id)})

        if action == "avatar":
            ctype = str(body.get("contentType", ""))
            if ctype not in IMAGE_TYPES:
                return resp(400, {"error": "Подойдёт картинка JPG, PNG или WEBP"})
            data = base64.b64decode(str(body.get("data", "")).split(",")[-1])
            if not data or len(data) > 3 * 1024 * 1024:
                return resp(400, {"error": "Картинка должна быть до 3 МБ"})
            key = f"avatars/{user_id}/{uuid.uuid4().hex}.{IMAGE_TYPES[ctype]}"
            s3 = boto3.client(
                "s3",
                endpoint_url="https://bucket.poehali.dev",
                aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            )
            s3.put_object(Bucket="files", Key=key, Body=data, ContentType=ctype)
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            cur.execute(f"UPDATE {SCHEMA}.users SET avatar_url = '{esc(url)}', updated_at = NOW() WHERE id = {user_id}")
            return resp(200, {"profile": load_profile(cur, user_id)})

        if action == "remove-avatar":
            cur.execute(f"UPDATE {SCHEMA}.users SET avatar_url = NULL, updated_at = NOW() WHERE id = {user_id}")
            return resp(200, {"profile": load_profile(cur, user_id)})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
