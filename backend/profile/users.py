import base64
import hashlib
import json
import os
import re
import secrets
import time
import uuid

import boto3
import psycopg2

from status import MAX_LEVEL, TITLES, level_for, points_sql

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
ONLINE_MINUTES = 5
BOT_SLOT = 15 * 60
BOT_ONLINE_SHARE = 60
BOT_DOMAIN = "@bots.traderka.ru"
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_GIFT = 100000


def upload_avatar(uid: int, ctype: str, raw: str) -> str:
    data = base64.b64decode(raw.split(",")[-1])
    if not data or len(data) > 3 * 1024 * 1024:
        raise ValueError("Картинка должна быть до 3 МБ")
    key = f"avatars/{uid}/{uuid.uuid4().hex}.{IMAGE_TYPES[ctype]}"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=ctype)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def bot_online(uid: int, now: float = None) -> bool:
    now = now or time.time()
    slot = int((now + (uid * 137) % BOT_SLOT) // BOT_SLOT)
    h = int(hashlib.md5(f"{uid}:{slot}".encode()).hexdigest()[:8], 16)
    return h % 100 < BOT_ONLINE_SHARE


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def display_name(name, email) -> str:
    if name:
        return name
    email = email or ""
    if email.endswith("@users.traderka.ru") or email.endswith(BOT_DOMAIN) or not email:
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
        base = f"SELECT u.id, u.name, u.email, {pts}, u.status_override, u.last_seen_at, u.created_at, u.is_bot, u.city, u.avatar_url, u.bonus_points, u.bio, u.favorite_coin, u.is_admin FROM {SCHEMA}.users u"

        def to_user(r, full=False) -> dict:
            st = level_for(int(r[3]), r[4])
            u = {"id": r[0], "name": display_name(r[1], r[2]), "level": st["level"], "title": st["title"], "avatar": r[9] or ""}
            if full:
                email = r[2] or ""
                u.update({
                    "email": "" if email.endswith("@users.traderka.ru") or email.endswith(BOT_DOMAIN) else email,
                    "isBot": bool(r[7]),
                    "online": bot_online(r[0]) if r[7] else bool(r[5] and (time.time() - r[5].timestamp()) < ONLINE_MINUTES * 60),
                    "city": r[8] or "",
                    "bonus": int(r[10] or 0),
                    "bio": r[11] or "",
                    "favoriteCoin": r[12] or "",
                    "isAdmin": bool(r[13]),
                    "autoTitle": level_for(int(r[3]))["title"],
                    "next": st["next"],
                    "nextTitle": st["nextTitle"],
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

            if qs.get("rating") == "1":
                cur.execute(
                    f"SELECT t.id, t.name, t.email, t.pts, t.status_override, t.city, t.created_at, "
                    f"RANK() OVER (ORDER BY t.pts DESC), t.avatar_url FROM (SELECT u.id, u.name, u.email, {pts} AS pts, u.status_override, u.city, u.created_at, u.avatar_url "
                    f"FROM {SCHEMA}.users u) t ORDER BY t.pts DESC, t.created_at ASC"
                )
                rows = cur.fetchall()
                total = len(rows)

                def to_row(r, place):
                    st = level_for(int(r[3]), r[4])
                    return {"id": r[0], "name": display_name(r[1], r[2]), "points": int(r[3]), "level": st["level"],
                            "title": st["title"], "city": r[5] or "", "place": place, "avatar": r[8] or ""}

                top = [to_row(r, i + 1) for i, r in enumerate(rows[:50])]
                mine = None
                if me:
                    for i, r in enumerate(rows):
                        if r[0] == me:
                            mine = to_row(r, i + 1)
                            break
                return resp(200, {"top": top, "me": mine, "total": total})

            if me:
                cur.execute(f"UPDATE {SCHEMA}.users SET last_seen_at = NOW() WHERE id = {me}")
            cur.execute(
                f"SELECT * FROM ({base} WHERE u.last_seen_at > NOW() - INTERVAL '{ONLINE_MINUTES} minutes' OR u.is_bot) t "
                f"ORDER BY COALESCE(t.status_override, 0) DESC LIMIT 400"
            )
            now = time.time()
            users = [to_user(r) for r in cur.fetchall() if not r[7] or bot_online(r[0], now)]
            users.sort(key=lambda u: (-u["level"], u["name"].lower()))
            return resp(200, {"online": users[:20], "total": len(users)})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "delete-user":
            uid = int(body.get("userId", 0) or 0)
            if uid == me:
                return resp(400, {"error": "Нельзя удалить самого себя"})
            cur.execute(f"SELECT is_admin FROM {SCHEMA}.users WHERE id = {uid}")
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Пользователь не найден"})
            if r[0]:
                return resp(400, {"error": "Нельзя удалить администратора"})
            for t in ("sessions", "refresh_tokens", "holdings", "news_reactions", "user_visits"):
                cur.execute(f"DELETE FROM {SCHEMA}.{t} WHERE user_id = {uid}")
            cur.execute(f"UPDATE {SCHEMA}.articles SET author_id = NULL WHERE author_id = {uid}")
            cur.execute(f"DELETE FROM {SCHEMA}.users WHERE id = {uid}")
            return resp(200, {"deleted": uid})

        if action in ("create-bot", "update-bot"):
            name = re.sub(r"\s+", " ", str(body.get("name", ""))).strip()[:60]
            city = re.sub(r"\s+", " ", str(body.get("city", ""))).strip()[:100]
            if len(name) < 2:
                return resp(400, {"error": "Имя бота — минимум 2 символа"})
            lvl = int(body.get("level", 1) or 1)
            if not 1 <= lvl <= MAX_LEVEL:
                return resp(400, {"error": "Такого статуса нет"})
            e = lambda v: v.replace("'", "''")
            if action == "create-bot":
                email = f"bot-{secrets.token_hex(6)}{BOT_DOMAIN}"
                cur.execute(
                    f"INSERT INTO {SCHEMA}.users (email, password_hash, name, city, status_override, is_bot) "
                    f"VALUES ('{email}', '', '{e(name)}', '{e(city)}', {lvl}, TRUE) RETURNING id"
                )
                uid = cur.fetchone()[0]
            else:
                uid = int(body.get("userId", 0) or 0)
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET name = '{e(name)}', city = '{e(city)}', status_override = {lvl} "
                    f"WHERE id = {uid} AND is_bot RETURNING id"
                )
                if not cur.fetchone():
                    return resp(404, {"error": "Бот не найден"})
            cur.execute(f"{base} WHERE u.id = {uid}")
            return resp(200, {"user": to_user(cur.fetchone(), True)})

        if action in ("bot-avatar", "remove-bot-avatar"):
            uid = int(body.get("userId", 0) or 0)
            cur.execute(f"SELECT 1 FROM {SCHEMA}.users WHERE id = {uid} AND is_bot")
            if not cur.fetchone():
                return resp(404, {"error": "Бот не найден"})
            if action == "bot-avatar":
                ctype = str(body.get("contentType", ""))
                if ctype not in IMAGE_TYPES:
                    return resp(400, {"error": "Подойдёт картинка JPG, PNG или WEBP"})
                try:
                    url = upload_avatar(uid, ctype, str(body.get("data", "")))
                except ValueError as err:
                    return resp(400, {"error": str(err)})
                cur.execute(f"UPDATE {SCHEMA}.users SET avatar_url = '{url}' WHERE id = {uid}")
            else:
                cur.execute(f"UPDATE {SCHEMA}.users SET avatar_url = NULL WHERE id = {uid}")
            cur.execute(f"{base} WHERE u.id = {uid}")
            return resp(200, {"user": to_user(cur.fetchone(), True)})

        if action == "gift-points":
            uid = int(body.get("userId", 0) or 0)
            amount = int(body.get("amount", 0) or 0)
            if amount == 0 or abs(amount) > MAX_GIFT:
                return resp(400, {"error": f"Укажите количество очков от 1 до {MAX_GIFT}"})
            cur.execute(
                f"UPDATE {SCHEMA}.users SET bonus_points = GREATEST(bonus_points + {amount}, 0) WHERE id = {uid} RETURNING id"
            )
            if not cur.fetchone():
                return resp(404, {"error": "Пользователь не найден"})
            cur.execute(f"{base} WHERE u.id = {uid}")
            return resp(200, {"user": to_user(cur.fetchone(), True)})

        if action != "set-status":
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
