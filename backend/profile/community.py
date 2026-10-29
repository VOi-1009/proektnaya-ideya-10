import base64
import json
import os
import re
import time
import uuid

import boto3
import psycopg2

from aibot import load_settings, moderate
from plans import viewer
from users import ONLINE_MINUTES, SOCIAL_KEYS, bot_online, display_name
from status import level_for, points_sql

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
EMOJIS = ["🚀", "🔥", "👍", "😂", "😮", "📉"]
MOODS = {"bull", "bear"}
MIN_LEVEL = 2
PAGE = 20
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
COIN_RE = re.compile(r"^[a-z0-9-]{1,64}$")


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def load_posts(cur, where: str, me, limit: int = PAGE) -> list:
    cur.execute(
        f"SELECT p.id, p.user_id, p.body, p.image_url, p.sentiment, p.coins, p.created_at, "
        f"u.name, u.email, u.avatar_url, {points_sql(SCHEMA)}, u.status_override, u.is_creator, u.supporter_no, u.founder_no "
        f"FROM {SCHEMA}.community_posts p JOIN {SCHEMA}.users u ON u.id = p.user_id "
        f"WHERE NOT p.hidden AND {where} ORDER BY p.id DESC LIMIT {int(limit)}"
    )
    rows = cur.fetchall()
    if not rows:
        return []
    ids = ", ".join(str(r[0]) for r in rows)
    cur.execute(f"SELECT post_id, emoji, COUNT(*) FROM {SCHEMA}.community_reactions WHERE post_id IN ({ids}) GROUP BY post_id, emoji")
    counts: dict = {}
    for pid, em, n in cur.fetchall():
        counts.setdefault(pid, {})[em] = int(n)
    mine: dict = {}
    followed: set = set()
    if me:
        cur.execute(f"SELECT post_id, emoji FROM {SCHEMA}.community_reactions WHERE user_id = {me} AND post_id IN ({ids})")
        for pid, em in cur.fetchall():
            mine.setdefault(pid, []).append(em)
        cur.execute(f"SELECT author_id FROM {SCHEMA}.community_follows WHERE follower_id = {me}")
        followed = {int(x[0]) for x in cur.fetchall()}
    out = []
    for r in rows:
        st = level_for(int(r[10]), r[11])
        out.append({
            "id": r[0],
            "body": r[2],
            "image": r[3],
            "sentiment": r[4],
            "coins": [c for c in r[5].split(",") if c],
            "createdAt": r[6].isoformat(),
            "user": {
                "id": r[1], "name": display_name(r[7], r[8]), "avatar": r[9] or "", "level": st["level"],
                "title": st["title"], "creator": bool(r[12]), "supporter": r[13], "founder": r[14],
            },
            "reactions": counts.get(r[0], {}),
            "mine": mine.get(r[0], []),
            "following": r[1] in followed,
        })
    return out


def load_author(cur, aid: int, me) -> dict:
    cur.execute(
        f"SELECT u.id, u.name, u.email, u.avatar_url, u.bio, u.city, u.headline, u.experience, u.interests, u.contacts, "
        f"u.created_at, u.last_seen_at, u.is_bot, u.is_ai, u.status_override, {points_sql(SCHEMA)}, u.founder_no, u.supporter_no, u.is_creator "
        f"FROM {SCHEMA}.users u WHERE u.id = {int(aid)}"
    )
    r = cur.fetchone()
    if not r:
        return {"error": "Автор не найден"}
    pts = int(r[15])
    st = level_for(pts, r[14])
    cur.execute(f"SELECT COUNT(*) + 1 FROM {SCHEMA}.users u WHERE {points_sql(SCHEMA)} > {pts}")
    place = int(cur.fetchone()[0])
    cur.execute(
        f"SELECT COUNT(*), COUNT(*) FILTER (WHERE sentiment = 'bull'), COUNT(*) FILTER (WHERE sentiment = 'bear') "
        f"FROM {SCHEMA}.community_posts WHERE user_id = {int(aid)} AND NOT hidden"
    )
    posts, bulls, bears = (int(x) for x in cur.fetchone())
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.community_follows WHERE author_id = {int(aid)}")
    followers = int(cur.fetchone()[0])
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.community_follows WHERE follower_id = {int(aid)}")
    following = int(cur.fetchone()[0])
    cur.execute(
        f"SELECT COUNT(*) FROM {SCHEMA}.community_reactions x JOIN {SCHEMA}.community_posts p ON p.id = x.post_id "
        f"WHERE p.user_id = {int(aid)} AND NOT p.hidden"
    )
    reactions = int(cur.fetchone()[0])
    is_following = False
    if me:
        cur.execute(f"SELECT 1 FROM {SCHEMA}.community_follows WHERE follower_id = {me} AND author_id = {int(aid)}")
        is_following = bool(cur.fetchone())
    try:
        contacts = {k: v for k, v in json.loads(r[9] or "{}").items() if k in SOCIAL_KEYS}
    except ValueError:
        contacts = {}
    has_contacts = bool(contacts)
    online = True if r[13] else bot_online(r[0]) if r[12] else bool(r[11] and (time.time() - r[11].timestamp()) < ONLINE_MINUTES * 60)
    return {"author": {
        "id": r[0], "name": display_name(r[1], r[2]), "avatar": r[3] or "", "bio": r[4] or "", "city": r[5] or "",
        "headline": r[6] or "", "experience": r[7] or "", "interests": r[8] or "",
        "contacts": contacts if me else {}, "contactsHidden": bool(not me and has_contacts),
        "createdAt": r[10].isoformat(), "online": online, "level": st["level"], "title": st["title"], "points": pts, "place": place,
        "founder": r[16], "supporter": r[17], "creator": bool(r[18]),
        "posts": posts, "bulls": bulls, "bears": bears, "followers": followers, "following": following, "reactions": reactions,
        "isFollowing": is_following, "isMe": bool(me and me == r[0]),
    }}


def handle_community(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        v = viewer(cur, token)
        me, is_admin = v["id"], v["admin"]
        can_write = bool(me) and (is_admin or v["level"] >= MIN_LEVEL)

        if method == "GET" and str(qs.get("profile", "")).isdigit():
            return resp(200, load_author(cur, int(qs["profile"]), me))

        if method == "GET":
            conds = ["TRUE"]
            tab = qs.get("tab", "all")
            if tab == "follow":
                if not me:
                    return resp(401, {"error": "Войдите, чтобы видеть ленту подписок"})
                conds.append(f"p.user_id IN (SELECT author_id FROM {SCHEMA}.community_follows WHERE follower_id = {me})")
            elif tab == "mood":
                mood = qs.get("mood", "")
                conds.append(f"p.sentiment = '{mood}'" if mood in MOODS else "p.sentiment IN ('bull', 'bear')")
            coin = str(qs.get("coin", "")).strip().lower()
            if coin and COIN_RE.match(coin):
                conds.append(f"(',' || p.coins || ',') LIKE '%,{coin},%'")
            if str(qs.get("author", "")).isdigit():
                conds.append(f"p.user_id = {int(qs['author'])}")
            if str(qs.get("before", "")).isdigit():
                conds.append(f"p.id < {int(qs['before'])}")
            posts = load_posts(cur, " AND ".join(conds), me)
            return resp(200, {"posts": posts, "canWrite": can_write, "loggedIn": bool(me), "isAdmin": is_admin, "me": me, "more": len(posts) >= PAGE})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not me:
            return resp(401, {"error": "Войдите в аккаунт"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "post":
            if not can_write:
                return resp(403, {"error": "Писать в сообществе можно со статуса «Студент»"})
            text = str(body.get("body", "")).strip()[:2000]
            sentiment = body.get("sentiment") if body.get("sentiment") in MOODS else ""
            coins = [c for c in (str(x).strip().lower() for x in (body.get("coins") or [])[:5]) if COIN_RE.match(c)]
            image = ""
            if body.get("image"):
                ctype = str(body.get("contentType", ""))
                if ctype not in IMAGE_TYPES:
                    return resp(400, {"error": "Подойдёт картинка JPG, PNG или WEBP"})
                data = base64.b64decode(str(body["image"]).split(",")[-1])
                if not data or len(data) > 3 * 1024 * 1024:
                    return resp(400, {"error": "Картинка должна быть до 3 МБ"})
                key = f"community/{me}/{uuid.uuid4().hex}.{IMAGE_TYPES[ctype]}"
                s3 = boto3.client(
                    "s3", endpoint_url="https://bucket.poehali.dev",
                    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"], aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
                )
                s3.put_object(Bucket="files", Key=key, Body=data, ContentType=ctype)
                image = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            if not text and not image:
                return resp(400, {"error": "Напишите текст или добавьте картинку"})
            if not is_admin and text:
                reason = moderate(text, load_settings(cur))
                if reason:
                    return resp(400, {"error": f"Пост не опубликован: {reason}"})
            cur.execute(
                f"INSERT INTO {SCHEMA}.community_posts (user_id, body, image_url, sentiment, coins) "
                f"VALUES ({me}, '{esc(text)}', '{esc(image)}', '{sentiment}', '{esc(','.join(coins))}') RETURNING id"
            )
            pid = cur.fetchone()[0]
            return resp(200, {"post": load_posts(cur, f"p.id = {int(pid)}", me)[0]})

        if action == "react":
            pid = int(body.get("id", 0) or 0)
            emoji = str(body.get("emoji", ""))
            if emoji not in EMOJIS:
                return resp(400, {"error": "Неизвестная реакция"})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.community_posts WHERE id = {pid} AND NOT hidden")
            if not cur.fetchone():
                return resp(404, {"error": "Пост не найден"})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.community_reactions WHERE post_id = {pid} AND user_id = {me} AND emoji = '{esc(emoji)}'")
            if cur.fetchone():
                cur.execute(f"DELETE FROM {SCHEMA}.community_reactions WHERE post_id = {pid} AND user_id = {me} AND emoji = '{esc(emoji)}'")
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.community_reactions (post_id, user_id, emoji) VALUES ({pid}, {me}, '{esc(emoji)}')")
            return resp(200, {"post": load_posts(cur, f"p.id = {pid}", me)[0]})

        if action == "follow":
            aid = int(body.get("authorId", 0) or 0)
            if aid == me or aid <= 0:
                return resp(400, {"error": "Нельзя подписаться на себя"})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.community_follows WHERE follower_id = {me} AND author_id = {aid}")
            if cur.fetchone():
                cur.execute(f"DELETE FROM {SCHEMA}.community_follows WHERE follower_id = {me} AND author_id = {aid}")
                return resp(200, {"following": False})
            cur.execute(f"INSERT INTO {SCHEMA}.community_follows (follower_id, author_id) VALUES ({me}, {aid})")
            return resp(200, {"following": True})

        if action == "remove":
            pid = int(body.get("id", 0) or 0)
            cur.execute(f"SELECT user_id FROM {SCHEMA}.community_posts WHERE id = {pid}")
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Пост не найден"})
            if int(r[0]) != me and not is_admin:
                return resp(403, {"error": "Можно убрать только свой пост"})
            cur.execute(f"UPDATE {SCHEMA}.community_posts SET hidden = TRUE WHERE id = {pid}")
            return resp(200, {"ok": True})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
