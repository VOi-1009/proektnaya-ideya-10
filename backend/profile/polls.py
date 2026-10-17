import hashlib
import json
import os
import re
import time

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
BOT_VOTE_SHARE = 85
BOT_VOTE_SPREAD_MIN = 6 * 60


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def h(*parts) -> int:
    return int(hashlib.md5(":".join(str(p) for p in parts).encode()).hexdigest()[:8], 16)


def esc(v: str) -> str:
    return v.replace("'", "''")


def bots_vote(cur, polls: list) -> None:
    if not polls:
        return
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE is_bot")
    bots = [r[0] for r in cur.fetchall()]
    if not bots:
        return
    now = time.time()
    rows = []
    for p in polls:
        if not p["botsVote"] or not p["active"] or not p["options"]:
            continue
        age_min = (now - p["_created"]) / 60
        weights = [max(o["seed"], 1) for o in p["options"]]
        total = sum(weights)
        for b in bots:
            if h("poll", p["id"], b) % 100 >= BOT_VOTE_SHARE:
                continue
            if age_min < h("delay", p["id"], b) % BOT_VOTE_SPREAD_MIN:
                continue
            pick = h("pick", p["id"], b) % total
            acc = 0
            for o, w in zip(p["options"], weights):
                acc += w
                if pick < acc:
                    rows.append(f"({p['id']}, {b}, {o['id']})")
                    break
    if rows:
        cur.execute(
            f"INSERT INTO {SCHEMA}.poll_votes (poll_id, user_id, option_id) VALUES {', '.join(rows)} "
            f"ON CONFLICT (poll_id, user_id) DO NOTHING"
        )


def load_polls(cur, me, only_active: bool, poll_id: int = 0) -> list:
    where = []
    if only_active:
        where.append("p.is_active")
    if poll_id:
        where.append(f"p.id = {int(poll_id)}")
    cond = f"WHERE {' AND '.join(where)}" if where else ""
    cur.execute(
        f"SELECT p.id, p.question, p.is_active, p.bots_vote, p.created_at FROM {SCHEMA}.polls p {cond} "
        f"ORDER BY p.created_at DESC LIMIT {3 if only_active else 100}"
    )
    polls = [
        {"id": r[0], "question": r[1], "active": bool(r[2]), "botsVote": bool(r[3]), "createdAt": r[4].isoformat(),
         "_created": r[4].timestamp(), "options": []}
        for r in cur.fetchall()
    ]
    if not polls:
        return []
    ids = ", ".join(str(p["id"]) for p in polls)
    cur.execute(
        f"SELECT o.id, o.poll_id, o.text, o.seed_votes FROM {SCHEMA}.poll_options o "
        f"WHERE o.poll_id IN ({ids}) ORDER BY o.position, o.id"
    )
    by_id = {p["id"]: p for p in polls}
    for r in cur.fetchall():
        by_id[r[1]]["options"].append({"id": r[0], "text": r[2], "seed": int(r[3]), "real": 0})

    bots_vote(cur, polls)

    cur.execute(
        f"SELECT option_id, COUNT(*) FROM {SCHEMA}.poll_votes WHERE poll_id IN ({ids}) GROUP BY option_id"
    )
    counts = {r[0]: int(r[1]) for r in cur.fetchall()}
    mine = {}
    if me:
        cur.execute(f"SELECT poll_id, option_id FROM {SCHEMA}.poll_votes WHERE poll_id IN ({ids}) AND user_id = {int(me)}")
        mine = {r[0]: r[1] for r in cur.fetchall()}
    for p in polls:
        for o in p["options"]:
            o["real"] = counts.get(o["id"], 0)
            o["votes"] = o["seed"] + o["real"]
        p["total"] = sum(o["votes"] for o in p["options"])
        p["mine"] = mine.get(p["id"])
        del p["_created"]
    return polls


def public_view(p: dict) -> dict:
    return {
        "id": p["id"], "question": p["question"], "total": p["total"], "mine": p["mine"],
        "options": [{"id": o["id"], "text": o["text"], "votes": o["votes"]} for o in p["options"]],
    }


def parse_options(raw) -> list:
    out = []
    for o in (raw or [])[:8]:
        text = re.sub(r"\s+", " ", str(o.get("text", ""))).strip()[:150]
        if not text:
            continue
        seed = max(0, min(int(o.get("seed", 0) or 0), 1_000_000))
        oid = int(o.get("id", 0) or 0)
        out.append({"id": oid, "text": text, "seed": seed})
    return out


def handle_polls(event: dict) -> dict:
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

        if method == "GET":
            if qs.get("admin") == "1":
                if not is_admin:
                    return resp(403, {"error": "Доступ только для администратора"})
                return resp(200, {"polls": load_polls(cur, me, False)})
            return resp(200, {"polls": [public_view(p) for p in load_polls(cur, me, True)]})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "vote":
            if not me:
                return resp(401, {"error": "Войдите, чтобы проголосовать"})
            pid = int(body.get("pollId", 0) or 0)
            oid = int(body.get("optionId", 0) or 0)
            cur.execute(
                f"SELECT 1 FROM {SCHEMA}.poll_options o JOIN {SCHEMA}.polls p ON p.id = o.poll_id "
                f"WHERE o.id = {oid} AND p.id = {pid} AND p.is_active"
            )
            if not cur.fetchone():
                return resp(404, {"error": "Опрос завершён или не найден"})
            cur.execute(
                f"INSERT INTO {SCHEMA}.poll_votes (poll_id, user_id, option_id) VALUES ({pid}, {me}, {oid}) "
                f"ON CONFLICT (poll_id, user_id) DO NOTHING"
            )
            polls = load_polls(cur, me, False, pid)
            return resp(200, {"poll": public_view(polls[0])})

        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})

        if action in ("create", "update"):
            question = re.sub(r"\s+", " ", str(body.get("question", ""))).strip()[:300]
            options = parse_options(body.get("options"))
            if len(question) < 3:
                return resp(400, {"error": "Напишите вопрос — минимум 3 символа"})
            if len(options) < 2:
                return resp(400, {"error": "Нужно минимум 2 варианта ответа"})
            active = "TRUE" if body.get("active", True) else "FALSE"
            bots = "TRUE" if body.get("botsVote", True) else "FALSE"
            if action == "create":
                cur.execute(
                    f"INSERT INTO {SCHEMA}.polls (question, is_active, bots_vote) VALUES ('{esc(question)}', {active}, {bots}) RETURNING id"
                )
                pid = cur.fetchone()[0]
                keep = []
            else:
                pid = int(body.get("id", 0) or 0)
                cur.execute(
                    f"UPDATE {SCHEMA}.polls SET question = '{esc(question)}', is_active = {active}, bots_vote = {bots} "
                    f"WHERE id = {pid} RETURNING id"
                )
                if not cur.fetchone():
                    return resp(404, {"error": "Опрос не найден"})
                cur.execute(f"SELECT id FROM {SCHEMA}.poll_options WHERE poll_id = {pid}")
                existing = {r[0] for r in cur.fetchall()}
                keep = [o["id"] for o in options if o["id"] in existing]
                gone = existing - set(keep)
                if gone:
                    g = ", ".join(str(i) for i in gone)
                    cur.execute(f"DELETE FROM {SCHEMA}.poll_votes WHERE option_id IN ({g})")
                    cur.execute(f"DELETE FROM {SCHEMA}.poll_options WHERE id IN ({g})")
            for pos, o in enumerate(options):
                if o["id"] in keep:
                    cur.execute(
                        f"UPDATE {SCHEMA}.poll_options SET text = '{esc(o['text'])}', seed_votes = {o['seed']}, position = {pos} "
                        f"WHERE id = {o['id']}"
                    )
                else:
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.poll_options (poll_id, text, seed_votes, position) "
                        f"VALUES ({pid}, '{esc(o['text'])}', {o['seed']}, {pos})"
                    )
            return resp(200, {"poll": load_polls(cur, me, False, pid)[0]})

        if action == "toggle":
            pid = int(body.get("id", 0) or 0)
            cur.execute(f"UPDATE {SCHEMA}.polls SET is_active = NOT is_active WHERE id = {pid} RETURNING id")
            if not cur.fetchone():
                return resp(404, {"error": "Опрос не найден"})
            return resp(200, {"poll": load_polls(cur, me, False, pid)[0]})

        if action == "delete":
            pid = int(body.get("id", 0) or 0)
            cur.execute(f"DELETE FROM {SCHEMA}.poll_votes WHERE poll_id = {pid}")
            cur.execute(f"DELETE FROM {SCHEMA}.poll_options WHERE poll_id = {pid}")
            cur.execute(f"DELETE FROM {SCHEMA}.polls WHERE id = {pid}")
            return resp(200, {"deleted": pid})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
