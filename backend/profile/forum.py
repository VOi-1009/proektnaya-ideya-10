import json
import os
import re

import psycopg2

from aibot import load_settings, log_block, moderate
from plans import viewer
from users import display_name

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
ADMIN_ONLY = 9
SEC_COLS = (
    "id, parent_id, title, description, sort, guests_read, read_plan, read_level, topic_plan, topic_level, reply_plan, reply_level, allow_users"
)


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def ids_of(raw: str) -> list:
    return [int(x) for x in re.findall(r"\d+", raw or "")][:200]


def sec_dict(r) -> dict:
    return {
        "id": r[0], "parentId": r[1], "title": r[2], "description": r[3], "sort": r[4], "guestsRead": bool(r[5]),
        "readPlan": r[6], "readLevel": r[7], "topicPlan": r[8], "topicLevel": r[9], "replyPlan": r[10], "replyLevel": r[11],
        "allowUsers": ids_of(r[12]),
    }


def can(sec: dict, v: dict, kind: str) -> bool:
    if v["admin"]:
        return True
    if v["id"] and v["id"] in sec["allowUsers"]:
        return True
    if kind == "read" and sec["guestsRead"]:
        return True
    if not v["id"]:
        return False
    plan = sec[kind + "Plan"]
    if plan == ADMIN_ONLY:
        return False
    return v["level"] >= sec[kind + "Level"]


def perms(sec: dict, v: dict) -> dict:
    return {"read": can(sec, v, "read"), "topic": can(sec, v, "topic"), "reply": can(sec, v, "reply")}


def load_sections(cur) -> list:
    cur.execute(f"SELECT {SEC_COLS} FROM {SCHEMA}.forum_sections ORDER BY sort, id")
    return [sec_dict(r) for r in cur.fetchall()]


def user_obj(r) -> dict:
    return {"id": r[0], "name": display_name(r[1], r[2]), "avatar": r[3] or "", "supporter": r[4], "creator": bool(r[5]), "isAi": bool(r[6]), "tier": int(r[7] or 0)}


USER_COLS = (
    "u.id, u.name, u.email, u.avatar_url, u.supporter_no, u.is_creator, u.is_ai, "
    f"(SELECT sb.tier FROM {SCHEMA}.subscriptions sb WHERE sb.user_id = u.id AND sb.expires_at > NOW())"
)


def handle_forum(event: dict) -> dict:
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
        sections = load_sections(cur)
        by_id = {s["id"]: s for s in sections}

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

        if method == "GET" and qs.get("admin") == "1":
            if not is_admin:
                return resp(403, {"error": "Доступ только для администратора"})
            all_ids = sorted({i for s in sections for i in s["allowUsers"]})
            names = {}
            if all_ids:
                cur.execute(f"SELECT id, name, email FROM {SCHEMA}.users WHERE id IN ({', '.join(str(i) for i in all_ids)})")
                names = {x[0]: display_name(x[1], x[2]) for x in cur.fetchall()}
            cur.execute(f"SELECT section_id, COUNT(*) FROM {SCHEMA}.forum_topics GROUP BY section_id")
            counts = {x[0]: int(x[1]) for x in cur.fetchall()}
            for s in sections:
                s["allowNames"] = [{"id": i, "name": names.get(i, f"#{i}")} for i in s["allowUsers"]]
                s["topics"] = counts.get(s["id"], 0)
            return resp(200, {"sections": sections})

        if method == "GET" and qs.get("topic"):
            tid = int(re.sub(r"\D", "", str(qs.get("topic")))[:9] or 0)
            cur.execute(f"SELECT id, section_id, title, pinned, closed, user_id, created_at FROM {SCHEMA}.forum_topics WHERE id = {tid}")
            t = cur.fetchone()
            sec = by_id.get(t[1]) if t else None
            if not t or not sec:
                return resp(404, {"error": "Тема не найдена"})
            p = perms(sec, v)
            if not p["read"]:
                return resp(403, {"error": "Нет доступа к этому разделу", "locked": True})
            cur.execute(
                f"SELECT p.id, p.text, p.created_at, {USER_COLS} FROM {SCHEMA}.forum_posts p JOIN {SCHEMA}.users u ON u.id = p.user_id "
                f"WHERE p.topic_id = {tid} ORDER BY p.id ASC LIMIT 500"
            )
            posts = [{
                "id": x[0], "text": x[1], "createdAt": x[2].isoformat(), "user": user_obj(x[3:]),
                "canDelete": bool(is_admin or (me and x[3] == me)),
            } for x in cur.fetchall()]
            return resp(200, {
                "topic": {"id": t[0], "sectionId": t[1], "title": t[2], "pinned": bool(t[3]), "closed": bool(t[4]), "createdAt": t[6].isoformat()},
                "section": {"id": sec["id"], "title": sec["title"]},
                "can": {"reply": p["reply"] and (not t[4] or is_admin), "moderate": is_admin},
                "posts": posts,
            })

        if method == "GET" and qs.get("section"):
            sid = int(re.sub(r"\D", "", str(qs.get("section")))[:9] or 0)
            sec = by_id.get(sid)
            if not sec:
                return resp(404, {"error": "Раздел не найден"})
            p = perms(sec, v)
            if not p["read"]:
                return resp(403, {"error": "Нет доступа к этому разделу", "locked": True})
            cur.execute(
                f"SELECT t.id, t.title, t.pinned, t.closed, t.posts_count, t.created_at, t.last_post_at, {USER_COLS} "
                f"FROM {SCHEMA}.forum_topics t JOIN {SCHEMA}.users u ON u.id = t.user_id WHERE t.section_id = {sid} "
                f"ORDER BY t.pinned DESC, t.last_post_at DESC LIMIT 100"
            )
            topics = [{
                "id": x[0], "title": x[1], "pinned": bool(x[2]), "closed": bool(x[3]), "posts": x[4],
                "createdAt": x[5].isoformat(), "lastPostAt": x[6].isoformat(), "user": user_obj(x[7:]),
            } for x in cur.fetchall()]
            return resp(200, {"section": {"id": sec["id"], "title": sec["title"], "description": sec["description"], "parentId": sec["parentId"]}, "can": p, "topics": topics})

        if method == "GET":
            cur.execute(f"SELECT section_id, COUNT(*), COALESCE(SUM(posts_count), 0), MAX(last_post_at) FROM {SCHEMA}.forum_topics GROUP BY section_id")
            stats = {x[0]: (int(x[1]), int(x[2]), x[3]) for x in cur.fetchall()}
            out = []
            for s in sections:
                st = stats.get(s["id"], (0, 0, None))
                out.append({
                    "id": s["id"], "parentId": s["parentId"], "title": s["title"], "description": s["description"],
                    "topics": st[0], "posts": st[1], "lastPostAt": st[2].isoformat() if st[2] else None,
                    "can": perms(s, v),
                    "need": {"plan": s["readPlan"], "level": s["readLevel"], "guests": s["guestsRead"]},
                })
            return resp(200, {"sections": out, "tier": v["tier"], "canCreateAny": any(x["can"]["topic"] for x in out)})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not me:
            return resp(401, {"error": "Войдите в аккаунт"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action in ("topic", "reply"):
            settings = load_settings(cur)
            text = re.sub(r"\n{3,}", "\n\n", str(body.get("text", ""))).strip()[:5000]
            if not text:
                return resp(400, {"error": "Напишите текст сообщения"})
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.forum_posts WHERE user_id = {me} AND created_at > NOW() - INTERVAL '30 seconds'")
            if int(cur.fetchone()[0]) >= 3:
                return resp(429, {"error": "Слишком часто — подождите немного"})
            if action == "topic":
                sec = by_id.get(int(body.get("sectionId", 0) or 0))
                title = re.sub(r"\s+", " ", str(body.get("title", ""))).strip()[:200]
                if not sec:
                    return resp(404, {"error": "Раздел не найден"})
                if not can(sec, v, "topic"):
                    return resp(403, {"error": "Создавать темы в этом разделе вам пока нельзя"})
                if len(title) < 3:
                    return resp(400, {"error": "Заголовок — минимум 3 символа"})
                if not is_admin:
                    reason = moderate(title + "\n" + text, settings)
                    if reason:
                        log_block(cur, me, "forum", title + "\n" + text, reason)
                        return resp(422, {"error": f"AiTKA не пропустил тему: {reason}"})
                cur.execute(
                    f"INSERT INTO {SCHEMA}.forum_topics (section_id, user_id, title) VALUES ({sec['id']}, {me}, '{esc(title)}') RETURNING id"
                )
                tid = cur.fetchone()[0]
                cur.execute(f"INSERT INTO {SCHEMA}.forum_posts (topic_id, user_id, text) VALUES ({tid}, {me}, '{esc(text)}')")
                return resp(200, {"id": tid})
            tid = int(body.get("topicId", 0) or 0)
            cur.execute(f"SELECT section_id, closed FROM {SCHEMA}.forum_topics WHERE id = {tid}")
            t = cur.fetchone()
            sec = by_id.get(t[0]) if t else None
            if not t or not sec:
                return resp(404, {"error": "Тема не найдена"})
            if not can(sec, v, "reply"):
                return resp(403, {"error": "Отвечать в этом разделе вам пока нельзя"})
            if t[1] and not is_admin:
                return resp(403, {"error": "Тема закрыта"})
            if not is_admin:
                reason = moderate(text, settings)
                if reason:
                    log_block(cur, me, "forum", text, reason)
                    return resp(422, {"error": f"AiTKA не пропустил сообщение: {reason}"})
            cur.execute(f"INSERT INTO {SCHEMA}.forum_posts (topic_id, user_id, text) VALUES ({tid}, {me}, '{esc(text)}')")
            cur.execute(f"UPDATE {SCHEMA}.forum_topics SET posts_count = posts_count + 1, last_post_at = NOW() WHERE id = {tid}")
            return resp(200, {"id": tid})

        if action == "delete-post":
            pid = int(body.get("id", 0) or 0)
            cur.execute(f"SELECT user_id, topic_id FROM {SCHEMA}.forum_posts WHERE id = {pid}")
            p = cur.fetchone()
            if not p:
                return resp(404, {"error": "Сообщение не найдено"})
            if not is_admin and p[0] != me:
                return resp(403, {"error": "Удалить можно только своё сообщение"})
            cur.execute(f"SELECT MIN(id) FROM {SCHEMA}.forum_posts WHERE topic_id = {p[1]}")
            first = cur.fetchone()[0]
            if first == pid:
                cur.execute(f"DELETE FROM {SCHEMA}.forum_posts WHERE topic_id = {p[1]}")
                cur.execute(f"DELETE FROM {SCHEMA}.forum_topics WHERE id = {p[1]}")
                return resp(200, {"topicDeleted": True})
            cur.execute(f"DELETE FROM {SCHEMA}.forum_posts WHERE id = {pid}")
            cur.execute(f"UPDATE {SCHEMA}.forum_topics SET posts_count = GREATEST(posts_count - 1, 1) WHERE id = {p[1]}")
            return resp(200, {"topicDeleted": False})

        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})

        if action in ("pin", "close"):
            col = "pinned" if action == "pin" else "closed"
            on = "TRUE" if body.get("on") else "FALSE"
            cur.execute(f"UPDATE {SCHEMA}.forum_topics SET {col} = {on} WHERE id = {int(body.get('id', 0) or 0)}")
            return resp(200, {"ok": True})

        if action == "delete-topic":
            tid = int(body.get("id", 0) or 0)
            cur.execute(f"DELETE FROM {SCHEMA}.forum_posts WHERE topic_id = {tid}")
            cur.execute(f"DELETE FROM {SCHEMA}.forum_topics WHERE id = {tid}")
            return resp(200, {"ok": True})

        if action == "section-save":
            sid = int(body.get("id", 0) or 0)
            title = re.sub(r"\s+", " ", str(body.get("title", ""))).strip()[:120]
            if len(title) < 2:
                return resp(400, {"error": "Название раздела — минимум 2 символа"})
            parent = body.get("parentId")
            parent = int(parent) if parent not in (None, "", 0, "0") else None
            if parent is not None:
                if parent == sid or parent not in by_id or by_id[parent]["parentId"] is not None:
                    return resp(400, {"error": "Подраздел можно создать только внутри основного раздела"})
                if sid and any(s["parentId"] == sid for s in sections):
                    return resp(400, {"error": "У этого раздела есть подразделы — сначала перенесите их"})

            def num(key: str, lo: int, hi: int, default: int) -> int:
                try:
                    return max(lo, min(int(body.get(key, default)), hi))
                except (TypeError, ValueError):
                    return default

            vals = {
                "title": f"'{esc(title)}'",
                "description": f"'{esc(str(body.get('description', '')).strip()[:300])}'",
                "parent_id": "NULL" if parent is None else str(parent),
                "sort": str(num("sort", 0, 9999, 0)),
                "guests_read": "TRUE" if body.get("guestsRead") else "FALSE",
                "read_plan": str(num("readPlan", 0, 9, 2)),
                "read_level": str(num("readLevel", 1, 12, 1)),
                "topic_plan": str(num("topicPlan", 0, 9, 2)),
                "topic_level": str(num("topicLevel", 1, 12, 1)),
                "reply_plan": str(num("replyPlan", 0, 9, 2)),
                "reply_level": str(num("replyLevel", 1, 12, 1)),
                "allow_users": f"'{','.join(str(i) for i in ids_of(','.join(str(x) for x in (body.get('allowUsers') or []))))}'",
            }
            if sid:
                sets = ", ".join(f"{k} = {x}" for k, x in vals.items())
                cur.execute(f"UPDATE {SCHEMA}.forum_sections SET {sets} WHERE id = {sid} RETURNING id")
                if not cur.fetchone():
                    return resp(404, {"error": "Раздел не найден"})
            else:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.forum_sections ({', '.join(vals)}) VALUES ({', '.join(vals.values())}) RETURNING id"
                )
                sid = cur.fetchone()[0]
            return resp(200, {"id": sid})

        if action == "section-delete":
            sid = int(body.get("id", 0) or 0)
            ids = [sid] + [s["id"] for s in sections if s["parentId"] == sid]
            in_list = ", ".join(str(i) for i in ids)
            cur.execute(f"DELETE FROM {SCHEMA}.forum_posts WHERE topic_id IN (SELECT id FROM {SCHEMA}.forum_topics WHERE section_id IN ({in_list}))")
            cur.execute(f"DELETE FROM {SCHEMA}.forum_topics WHERE section_id IN ({in_list})")
            cur.execute(f"DELETE FROM {SCHEMA}.forum_sections WHERE id IN ({in_list})")
            return resp(200, {"ok": True})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
