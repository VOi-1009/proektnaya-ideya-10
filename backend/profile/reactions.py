import json
import os
import re

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
ID_RE = re.compile(r"^[a-f0-9]{6,32}$")


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False)}


def summary(cur, ids: list, me) -> dict:
    if not ids:
        return {}
    in_list = ", ".join(f"'{i}'" for i in ids)
    mine_sql = f"MAX(CASE WHEN user_id = {int(me)} THEN value END)" if me else "NULL"
    cur.execute(
        f"SELECT news_id, COUNT(*) FILTER (WHERE value = 1), COUNT(*) FILTER (WHERE value = -1), {mine_sql} "
        f"FROM {SCHEMA}.news_reactions WHERE news_id IN ({in_list}) GROUP BY news_id"
    )
    return {r[0]: {"likes": int(r[1]), "dislikes": int(r[2]), "mine": int(r[3]) if r[3] else 0} for r in cur.fetchall()}


def handle_reactions(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        me = None
        if token:
            cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = '{token}' AND expires_at > NOW()")
            r = cur.fetchone()
            me = int(r[0]) if r else None

        if method == "GET" and qs.get("top"):
            days = 7
            cur.execute(
                f"SELECT n.id, n.title, n.link, n.source, n.kind, "
                f"COUNT(*) FILTER (WHERE r.value = 1), COUNT(*) FILTER (WHERE r.value = -1), COUNT(*) "
                f"FROM {SCHEMA}.news_reactions r JOIN {SCHEMA}.news_items n ON n.id = r.news_id "
                f"WHERE r.created_at > NOW() - INTERVAL '{days} days' "
                f"GROUP BY n.id, n.title, n.link, n.source, n.kind ORDER BY COUNT(*) DESC, MAX(r.created_at) DESC LIMIT 5"
            )
            top = [
                {"id": r[0], "title": r[1], "link": r[2], "source": r[3], "kind": r[4], "likes": int(r[5]), "dislikes": int(r[6]), "total": int(r[7])}
                for r in cur.fetchall()
            ]
            return resp(200, {"top": top})

        if method == "GET":
            ids = [i for i in str(qs.get("ids", "")).split(",") if ID_RE.match(i)][:100]
            return resp(200, {"reactions": summary(cur, ids, me)})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not me:
            return resp(401, {"error": "Войдите, чтобы оценивать новости"})
        body = json.loads(event.get("body") or "{}")
        nid = str(body.get("newsId", ""))
        value = int(body.get("value", 0) or 0)
        if not ID_RE.match(nid) or value not in (-1, 0, 1):
            return resp(400, {"error": "Некорректные данные"})
        title = str(body.get("title", "")).strip()[:500]
        link = str(body.get("link", "")).strip()[:1000]
        if title and link.startswith("http"):
            source = str(body.get("source", "")).strip()[:60]
            kind = "world" if body.get("kind") == "world" else "crypto"
            e = lambda v: v.replace("'", "''")
            cur.execute(
                f"INSERT INTO {SCHEMA}.news_items (id, kind, title, link, source) VALUES ('{nid}', '{kind}', '{e(title)}', '{e(link)}', '{e(source)}') "
                f"ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title"
            )
        if value == 0:
            cur.execute(f"DELETE FROM {SCHEMA}.news_reactions WHERE news_id = '{nid}' AND user_id = {me}")
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.news_reactions (news_id, user_id, value) VALUES ('{nid}', {me}, {value}) "
                f"ON CONFLICT (news_id, user_id) DO UPDATE SET value = EXCLUDED.value, created_at = NOW()"
            )
        s = summary(cur, [nid], me).get(nid, {"likes": 0, "dislikes": 0, "mine": 0})
        return resp(200, {"newsId": nid, **s})
    finally:
        cur.close()
        conn.close()
