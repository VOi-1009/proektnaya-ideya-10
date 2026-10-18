import json
import os
import re
import time

import psycopg2

from status import level_for, points_sql
from users import display_name
from aibot import bot_reply, load_settings, log_block, maybe_daily, moderate

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
COLORS = {"emerald", "rose", "sky", "amber", "violet", "slate"}
ACCESS = {"all", "level", "list"}


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def load_rooms(cur, with_archived: bool = False) -> list:
    cond = "" if with_archived else "WHERE NOT archived"
    cur.execute(
        f"SELECT id, name, topic, color, access, min_level, sort, archived FROM {SCHEMA}.chat_rooms {cond} ORDER BY sort, created_at"
    )
    rooms = [
        {"id": x[0], "name": x[1], "topic": x[2], "color": x[3], "access": x[4], "minLevel": int(x[5]), "sort": int(x[6]), "archived": bool(x[7])}
        for x in cur.fetchall()
    ]
    cur.execute(f"SELECT room_id, user_id FROM {SCHEMA}.chat_room_members")
    members = {}
    for rid, uid in cur.fetchall():
        members.setdefault(rid, []).append(int(uid))
    for r in rooms:
        r["members"] = members.get(r["id"], [])
    return rooms


def can_enter(room: dict, uid, is_admin: bool, level: int) -> bool:
    if is_admin:
        return True
    if not uid:
        return False
    if room["access"] == "list":
        return uid in room["members"]
    if room["access"] == "level":
        return level >= room["minLevel"]
    return True


def denied_text(room: dict) -> str:
    if room["access"] == "list":
        return "Это закрытый чат — доступ выдаёт администратор"
    return "Чат доступен со статуса «Наблюдатель»" if room["minLevel"] <= 2 else "Чат откроется с более высокого статуса"


def handle_chat(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}
    body = json.loads(event.get("body") or "{}") if method == "POST" else {}
    room_id = str(qs.get("room") or body.get("room") or "")

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        pts = points_sql(SCHEMA)
        me, is_admin, my_level = None, False, 1
        if token:
            cur.execute(
                f"SELECT u.id, {pts}, u.status_override, u.is_admin FROM {SCHEMA}.sessions s "
                f"JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token = '{token}' AND s.expires_at > NOW()"
            )
            r = cur.fetchone()
            if r:
                me, is_admin = int(r[0]), bool(r[3])
                my_level = level_for(int(r[1]), r[2])["level"]

        if method == "GET" and qs.get("rooms") is not None:
            admin_view = qs.get("admin") == "1"
            if admin_view and not is_admin:
                return resp(403, {"error": "Доступ только для администратора"})
            rooms = load_rooms(cur, with_archived=admin_view)
            if admin_view:
                ids = sorted({i for r in rooms for i in r["members"]})
                names = {}
                if ids:
                    cur.execute(f"SELECT id, name, email FROM {SCHEMA}.users WHERE id IN ({', '.join(str(i) for i in ids)})")
                    names = {x[0]: display_name(x[1], x[2]) for x in cur.fetchall()}
                cur.execute(f"SELECT room, COUNT(*) FROM {SCHEMA}.chat_messages GROUP BY room")
                counts = {x[0]: int(x[1]) for x in cur.fetchall()}
                for r in rooms:
                    r["memberNames"] = [{"id": i, "name": names.get(i, f"#{i}")} for i in r["members"]]
                    r["messages"] = counts.get(r["id"], 0)
                return resp(200, {"rooms": rooms})
            visible = [r for r in rooms if r["access"] != "list" or is_admin or (me and me in r["members"])]
            for r in visible:
                r["canEnter"] = can_enter(r, me, is_admin, my_level)
                r.pop("members", None)
            return resp(200, {"rooms": visible})

        if method == "GET" and qs.get("find") is not None:
            if not is_admin:
                return resp(403, {"error": "Доступ только для администратора"})
            q = esc(re.sub(r"[%_\\]", "", str(qs.get("find"))).strip()[:40])
            if len(q) < 1:
                return resp(200, {"users": []})
            cond = f"u.id = {int(q)} OR " if q.isdigit() else ""
            cur.execute(
                f"SELECT u.id, u.name, u.email FROM {SCHEMA}.users u WHERE NOT u.is_bot AND ({cond}LOWER(COALESCE(u.name, '')) LIKE LOWER('%{q}%') "
                f"OR LOWER(COALESCE(u.email, '')) LIKE LOWER('%{q}%')) ORDER BY u.id LIMIT 8"
            )
            return resp(200, {"users": [{"id": x[0], "name": display_name(x[1], x[2])} for x in cur.fetchall()]})

        if method == "POST" and body.get("action"):
            if not is_admin:
                return resp(403, {"error": "Доступ только для администратора"})
            action = str(body["action"])
            if action == "room-save":
                rid = re.sub(r"[^a-z0-9]", "", str(body.get("id") or ""))[:20]
                name = str(body.get("name", "")).strip()[:60]
                topic = str(body.get("topic", "")).strip()[:200]
                color = str(body.get("color", "sky"))
                access = str(body.get("access", "level"))
                if len(name) < 2:
                    return resp(400, {"error": "Введите название чата"})
                if color not in COLORS or access not in ACCESS:
                    return resp(400, {"error": "Неверные настройки чата"})
                min_level = min(max(int(body.get("minLevel", 2) or 2), 1), 7)
                sort = min(max(int(body.get("sort", 10) or 0), 0), 9999)
                members = sorted({int(i) for i in (body.get("members") or []) if str(i).isdigit()})[:500]
                if rid:
                    cur.execute(
                        f"UPDATE {SCHEMA}.chat_rooms SET name = '{esc(name)}', topic = '{esc(topic)}', color = '{color}', access = '{access}', "
                        f"min_level = {min_level}, sort = {sort}, archived = FALSE WHERE id = '{rid}' RETURNING id"
                    )
                    if not cur.fetchone():
                        return resp(404, {"error": "Чат не найден"})
                else:
                    rid = f"c{int(time.time() * 1000) % 10**12}"
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.chat_rooms (id, name, topic, color, access, min_level, sort) "
                        f"VALUES ('{rid}', '{esc(name)}', '{esc(topic)}', '{color}', '{access}', {min_level}, {sort})"
                    )
                cur.execute(f"SELECT user_id FROM {SCHEMA}.chat_room_members WHERE room_id = '{rid}'")
                have = {int(x[0]) for x in cur.fetchall()}
                for uid in members:
                    if uid not in have:
                        cur.execute(f"INSERT INTO {SCHEMA}.chat_room_members (room_id, user_id) VALUES ('{rid}', {uid}) ON CONFLICT DO NOTHING")
                drop = [str(u) for u in have if u not in members]
                if drop:
                    cur.execute(f"DELETE FROM {SCHEMA}.chat_room_members WHERE room_id = '{rid}' AND user_id IN ({', '.join(drop)})")
                return resp(200, {"id": rid})
            if action == "room-archive":
                rid = esc(str(body.get("id", "")))
                cur.execute(f"UPDATE {SCHEMA}.chat_rooms SET archived = {'TRUE' if body.get('archived', True) else 'FALSE'} WHERE id = '{rid}'")
                return resp(200, {"ok": True})
            if action == "msg-delete":
                cur.execute(f"DELETE FROM {SCHEMA}.chat_messages WHERE id = {int(body.get('id', 0) or 0)}")
                return resp(200, {"ok": True})
            if action == "room-clear":
                cur.execute(f"DELETE FROM {SCHEMA}.chat_messages WHERE room = '{esc(str(body.get('id', '')))}'")
                return resp(200, {"ok": True})
            return resp(400, {"error": "Неизвестное действие"})

        cur.execute(f"SELECT id, name, topic, color, access, min_level, sort, archived FROM {SCHEMA}.chat_rooms WHERE id = '{esc(room_id)}'")
        rr = cur.fetchone()
        if not rr or rr[7]:
            return resp(400, {"error": "Неизвестный чат"})
        room = {"id": rr[0], "name": rr[1], "topic": rr[2], "color": rr[3], "access": rr[4], "minLevel": int(rr[5]), "sort": int(rr[6]), "members": []}
        if not me:
            return resp(401, {"error": "Войдите в аккаунт, чтобы открыть чат"})
        if room["access"] == "list":
            cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_room_members WHERE room_id = '{room['id']}' AND user_id = {me}")
            room["members"] = [me] if cur.fetchone() else []
        if not can_enter(room, me, is_admin, my_level):
            return resp(403, {"error": denied_text(room)})
        room = room["id"]

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
            return resp(200, {"items": items, "canModerate": is_admin})

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
        settings = load_settings(cur)
        if not is_admin:
            reason = moderate(text, settings)
            if reason:
                log_block(cur, me, room, text, reason)
                return resp(422, {"error": f"AiTraderKa не пропустил сообщение: {reason}", "moderated": True})
        cur.execute(f"INSERT INTO {SCHEMA}.chat_messages (room, user_id, text) VALUES ('{room}', {me}, '{esc(text)}') RETURNING id")
        mid = cur.fetchone()[0]
        cur.execute(f"SELECT name, email FROM {SCHEMA}.users WHERE id = {me}")
        nm = cur.fetchone()
        bot_reply(cur, settings, room, text, display_name(nm[0], nm[1]) if nm else "", my_level)
        return resp(200, {"id": mid})
    finally:
        cur.close()
        conn.close()