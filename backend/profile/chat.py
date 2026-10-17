import json
import os
import re

import psycopg2

from status import level_for, points_sql
from users import display_name
from aibot import load_settings, log_block, moderate

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
ROOMS = {"green", "red", "premium"}
MIN_LEVEL = 2


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def handle_chat(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}
    body = json.loads(event.get("body") or "{}") if method == "POST" else {}
    room = str(qs.get("room") or body.get("room") or "")
    if room not in ROOMS:
        return resp(400, {"error": "Неизвестный чат"})
    if not token:
        return resp(401, {"error": "Войдите в аккаунт, чтобы открыть чат"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        pts = points_sql(SCHEMA)
        cur.execute(
            f"SELECT u.id, {pts}, u.status_override, u.is_admin, u.supporter_no, u.is_creator FROM {SCHEMA}.sessions s "
            f"JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token = '{token}' AND s.expires_at > NOW()"
        )
        r = cur.fetchone()
        if not r:
            return resp(401, {"error": "Сессия истекла, войдите снова"})
        me, is_admin = int(r[0]), bool(r[3])
        if room == "premium":
            if not (is_admin or r[4] or r[5]):
                return resp(403, {"error": "Премиум-чат доступен тем, кто поддержал проект"})
        elif level_for(int(r[1]), r[2])["level"] < MIN_LEVEL and not is_admin:
            return resp(403, {"error": "Чат доступен со статуса «Наблюдатель»"})

        if method == "GET":
            after = int(qs.get("after") or 0)
            cond = f"AND m.id > {after}" if after else ""
            cur.execute(
                f"SELECT * FROM (SELECT m.id, m.text, m.created_at, u.id, u.name, u.email, u.avatar_url, {pts}, u.status_override, u.supporter_no, u.is_creator, u.is_bot, u.is_ai "
                f"FROM {SCHEMA}.chat_messages m JOIN {SCHEMA}.users u ON u.id = m.user_id "
                f"WHERE m.room = '{room}' {cond} ORDER BY m.id DESC LIMIT 100) t ORDER BY 1"
            )
            items = [
                {
                    "id": x[0], "text": x[1], "createdAt": x[2].isoformat(),
                    "user": {"id": x[3], "name": display_name(x[4], x[5]), "avatar": x[6] or "", "level": level_for(int(x[7]), x[8])["level"],
                             "supporter": x[9], "creator": bool(x[10]),
                             "isBot": bool(x[11]), "isAi": bool(x[12])},
                    "mine": x[3] == me,
                }
                for x in cur.fetchall()
            ]
            return resp(200, {"items": items})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        text = re.sub(r"\n{3,}", "\n\n", str(body.get("text", ""))).strip()[:1000]
        if not text:
            return resp(400, {"error": "Пустое сообщение"})
        cur.execute(
            f"SELECT COUNT(*) FROM {SCHEMA}.chat_messages WHERE user_id = {me} AND created_at > NOW() - INTERVAL '10 seconds'"
        )
        if int(cur.fetchone()[0]) >= 5:
            return resp(429, {"error": "Слишком часто — подождите пару секунд"})
        if not is_admin:
            reason = moderate(text, load_settings(cur))
            if reason:
                log_block(cur, me, room, text, reason)
                return resp(422, {"error": f"AiTraderKa не пропустил сообщение: {reason}", "moderated": True})
        cur.execute(f"INSERT INTO {SCHEMA}.chat_messages (room, user_id, text) VALUES ('{room}', {me}, '{esc(text)}') RETURNING id")
        return resp(200, {"id": cur.fetchone()[0]})
    finally:
        cur.close()
        conn.close()
