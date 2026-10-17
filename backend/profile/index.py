import base64
import json
import os
import re
import uuid

import boto3
import psycopg2

from articles import handle_articles
from blocks import handle_blocks
from status import level_for
from achievements import special_for
from users import handle_users
from reactions import handle_reactions
from polls import handle_polls
from radars import handle_radars
from sitenews import handle_site_news
from chat import handle_chat
from donate import handle_donate
from aibot import handle_aibot
from plans import handle_plans
from forum import handle_forum

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
COIN_RE = re.compile(r"^[a-z0-9-]{0,64}$")
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def load_profile(cur, user_id: int) -> dict:
    cur.execute(
        f"SELECT u.id, u.email, u.name, u.avatar_url, u.bio, u.city, u.favorite_coin, u.created_at, "
        f"(SELECT COUNT(*) FROM {SCHEMA}.user_visits v WHERE v.user_id = u.id), "
        f"(SELECT COUNT(*) FROM {SCHEMA}.holdings h WHERE h.user_id = u.id), u.status_override, u.founder_no, u.supporter_no, u.is_creator, u.promo_code "
        f"FROM {SCHEMA}.users u WHERE u.id = {int(user_id)}"
    )
    r = cur.fetchone()
    email = r[1] or ""
    if email.endswith("@users.traderka.ru"):
        email = ""
    days, coins = int(r[8]), int(r[9])
    cur.execute(
        f"SELECT COALESCE(MAX(c), 0) FROM (SELECT COUNT(*) c FROM (SELECT day, day - (ROW_NUMBER() OVER (ORDER BY day))::int AS g "
        f"FROM {SCHEMA}.user_visits WHERE user_id = {int(user_id)}) t GROUP BY g) s"
    )
    best_streak = int(cur.fetchone()[0])
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE founder_no IS NOT NULL")
    founders_taken = int(cur.fetchone()[0])
    cur.execute(
        f"SELECT COUNT(*) FROM (SELECT day, MAX(day) OVER () AS top, ROW_NUMBER() OVER (ORDER BY day DESC) AS rn "
        f"FROM {SCHEMA}.user_visits WHERE user_id = {int(user_id)}) t "
        f"WHERE t.day = t.top - (t.rn - 1)::int AND t.top >= CURRENT_DATE - 1"
    )
    streak = int(cur.fetchone()[0])
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
        "stats": {"days": days, "coins": coins, "filled": filled, "fields": 5, "streak": streak, "bestStreak": best_streak},
        "achievements": [
            {"id": "streak7", "done": best_streak >= 7, "progress": min(max(best_streak, streak), 7), "goal": 7},
            {"id": "firstCoin", "done": coins >= 1, "progress": min(coins, 1), "goal": 1},
            {"id": "fullProfile", "done": filled >= 5, "progress": filled, "goal": 5},
        ],
        "status": level_for(points, r[10]),
        "special": special_for(cur, SCHEMA, user_id),
        "founder": r[11],
        "supporter": r[12],
        "creator": bool(r[13]),
        "promo": r[14] or "",
        "foundersTaken": founders_taken,
    }


def handler(event: dict, context) -> dict:
    """Личный кабинет (профиль, статус, аватар), статьи (?resource=articles) и пользователи онлайн/смена статусов (?resource=users), лайки новостей (?resource=reactions), опросы (?resource=polls), радары (?resource=radars), новости сайта (?resource=sitenews), чаты зелёных и красных (?resource=chat&room=green|red), донаты (?resource=donate), ИИ-бот AiTraderKa (?resource=aibot), подписки (?resource=plans), форум (?resource=forum)"""
    method = event.get("httpMethod", "GET")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    resource = (event.get("queryStringParameters") or {}).get("resource")
    if resource == "articles":
        return handle_articles(event)
    if resource == "users":
        return handle_users(event)
    if resource == "reactions":
        return handle_reactions(event)
    if resource == "blocks":
        return handle_blocks(event)
    if resource == "polls":
        return handle_polls(event)
    if resource == "radars":
        return handle_radars(event)
    if resource == "sitenews":
        return handle_site_news(event)
    if resource == "chat":
        return handle_chat(event)
    if resource == "donate":
        return handle_donate(event)
    if resource == "aibot":
        return handle_aibot(event)
    if resource == "plans":
        return handle_plans(event)
    if resource == "forum":
        return handle_forum(event)

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