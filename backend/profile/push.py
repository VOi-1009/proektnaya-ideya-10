import base64
import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, wait

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
DEFAULT_PUSH = {"enabled": True, "daily": True, "digest": True}
SETTINGS_KEY = "ai_push"
VAPID_KEY = "push_vapid"
SITE = os.environ.get("SITE_URL") or "https://traderka.ru"


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return str(v).replace("'", "''").replace("\\", "")


def b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def load_settings(cur) -> dict:
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{SETTINGS_KEY}'")
    r = cur.fetchone()
    try:
        raw = json.loads(r[0]) if r and r[0] else {}
    except ValueError:
        raw = {}
    return {**DEFAULT_PUSH, **{k: bool(raw.get(k, v)) for k, v in DEFAULT_PUSH.items()}}


def vapid_keys(cur) -> dict:
    env = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{VAPID_KEY}'")
    r = cur.fetchone()
    stored = {}
    if r and r[0]:
        try:
            stored = json.loads(r[0])
        except ValueError:
            stored = {}
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec

    if env:
        pad = "=" * (-len(env) % 4)
        num = int.from_bytes(base64.urlsafe_b64decode(env + pad), "big")
        key = ec.derive_private_key(num, ec.SECP256R1())
        pub = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        return {"private": env, "public": b64u(pub)}
    if stored.get("private") and stored.get("public"):
        return stored
    key = ec.generate_private_key(ec.SECP256R1())
    priv = b64u(key.private_numbers().private_value.to_bytes(32, "big"))
    pub = b64u(key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint))
    data = {"private": priv, "public": pub}
    val = esc(json.dumps(data))
    cur.execute(
        f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('{VAPID_KEY}', '{val}', NOW()) "
        f"ON CONFLICT (key) DO NOTHING"
    )
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{VAPID_KEY}'")
    return json.loads(cur.fetchone()[0])


def short(text: str, n: int) -> str:
    t = re.sub(r"\s+", " ", text or "").strip()
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


def create_message(cur, title: str, body: str, url: str, post_id=None) -> int:
    pid = int(post_id) if post_id else "NULL"
    cur.execute(
        f"INSERT INTO {SCHEMA}.push_messages (post_id, title, body, url) "
        f"VALUES ({pid}, '{esc(short(title, 120))}', '{esc(short(body, 400))}', '{esc(url[:300])}') RETURNING id"
    )
    mid = cur.fetchone()[0]
    cur.execute(
        f"INSERT INTO {SCHEMA}.push_queue (message_id, sub_id) SELECT {mid}, id FROM {SCHEMA}.push_subscriptions "
        f"ON CONFLICT (message_id, sub_id) DO NOTHING"
    )
    return mid


def enqueue_post(cur, post_id: int, kind: str) -> int:
    cfg = load_settings(cur)
    if not cfg["enabled"]:
        return 0
    if kind == "daily" and not cfg["daily"]:
        return 0
    if kind in ("auto", "manual", "move") and not cfg["digest"]:
        return 0
    cur.execute(f"SELECT 1 FROM {SCHEMA}.push_messages WHERE post_id = {int(post_id)}")
    if cur.fetchone():
        return 0
    cur.execute(f"SELECT title, body FROM {SCHEMA}.ai_posts WHERE id = {int(post_id)}")
    row = cur.fetchone()
    if not row:
        return 0
    mid = create_message(cur, f"AiTKA: {row[0]}", row[1], "/?c=ainews&full=1", post_id)
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.push_queue WHERE message_id = {mid}")
    return int(cur.fetchone()[0])


def send_one(sub: dict, payload: str, private: str):
    from pywebpush import webpush

    try:
        webpush(
            subscription_info={"endpoint": sub["endpoint"], "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]}},
            data=payload,
            vapid_private_key=private,
            vapid_claims={"sub": SITE},
            timeout=3,
            ttl=86400,
        )
        return sub["qid"], "ok", ""
    except Exception as e:
        code = getattr(getattr(e, "response", None), "status_code", 0)
        return sub["qid"], "gone" if code in (404, 410) else "fail", f"{code or ''} {e}"[:250]


def process_queue(cur, limit: int = 30, budget: float = 3.2) -> dict:
    out = {"sent": 0, "failed": 0, "removed": 0, "left": 0}
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.push_queue WHERE status = 'pending'")
    out["left"] = int(cur.fetchone()[0])
    if out["left"] == 0:
        return out
    cur.execute(
        f"SELECT q.id, s.id, s.endpoint, s.p256dh, s.auth, m.title, m.body, m.url FROM {SCHEMA}.push_queue q "
        f"JOIN {SCHEMA}.push_subscriptions s ON s.id = q.sub_id JOIN {SCHEMA}.push_messages m ON m.id = q.message_id "
        f"WHERE q.status = 'pending' AND q.attempts < 3 ORDER BY q.id LIMIT {int(limit)}"
    )
    rows = cur.fetchall()
    if not rows:
        return out
    keys = vapid_keys(cur)
    jobs = []
    for qid, sid, endpoint, p256dh, auth, title, body, url in rows:
        payload = json.dumps({"title": title, "body": body, "url": url}, ensure_ascii=False)
        jobs.append(({"qid": qid, "sid": sid, "endpoint": endpoint, "p256dh": p256dh, "auth": auth}, payload))
    sub_by_q = {j[0]["qid"]: j[0]["sid"] for j in jobs}
    ex = ThreadPoolExecutor(max_workers=10)
    try:
        futs = [ex.submit(send_one, s, p, keys["private"]) for s, p in jobs]
        done, _ = wait(futs, timeout=budget)
        results = [f.result() for f in done]
    finally:
        ex.shutdown(wait=False, cancel_futures=True)
    for qid, status, err in results:
        if status == "ok":
            cur.execute(f"UPDATE {SCHEMA}.push_queue SET status = 'sent', sent_at = NOW(), error = '' WHERE id = {qid}")
            cur.execute(f"UPDATE {SCHEMA}.push_subscriptions SET last_ok_at = NOW() WHERE id = {sub_by_q[qid]}")
            out["sent"] += 1
        elif status == "gone":
            sid = sub_by_q[qid]
            cur.execute(f"DELETE FROM {SCHEMA}.push_queue WHERE sub_id = {sid}")
            cur.execute(f"DELETE FROM {SCHEMA}.push_subscriptions WHERE id = {sid}")
            out["removed"] += 1
        else:
            cur.execute(
                f"UPDATE {SCHEMA}.push_queue SET attempts = attempts + 1, error = '{esc(err)}', "
                f"status = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'pending' END WHERE id = {qid}"
            )
            out["failed"] += 1
    out["left"] = max(0, out["left"] - out["sent"] - out["removed"])
    return out


def stats(cur) -> dict:
    cur.execute(f"SELECT COUNT(*), COUNT(user_id) FROM {SCHEMA}.push_subscriptions")
    s = cur.fetchone()
    cur.execute(f"SELECT status, COUNT(*) FROM {SCHEMA}.push_queue GROUP BY status")
    c = {r[0]: int(r[1]) for r in cur.fetchall()}
    cur.execute(
        f"SELECT m.id, m.title, m.body, m.url, m.post_id, m.created_at, "
        f"COUNT(q.id) FILTER (WHERE q.status = 'sent'), COUNT(q.id) FILTER (WHERE q.status = 'pending'), "
        f"COUNT(q.id) FILTER (WHERE q.status = 'failed') "
        f"FROM {SCHEMA}.push_messages m LEFT JOIN {SCHEMA}.push_queue q ON q.message_id = m.id "
        f"GROUP BY m.id ORDER BY m.id DESC LIMIT 20"
    )
    messages = [
        {"id": r[0], "title": r[1], "body": r[2], "url": r[3], "postId": r[4], "createdAt": r[5].isoformat(),
         "sent": int(r[6]), "pending": int(r[7]), "failed": int(r[8])}
        for r in cur.fetchall()
    ]
    return {
        "subscribers": int(s[0]), "withAccount": int(s[1]), "sent": c.get("sent", 0), "pending": c.get("pending", 0),
        "failed": c.get("failed", 0), "messages": messages,
    }


def handle_push(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        is_admin, me = False, None
        if token:
            cur.execute(
                f"SELECT u.is_admin, u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = '{token}' AND s.expires_at > NOW()"
            )
            r = cur.fetchone()
            is_admin = bool(r and r[0])
            me = int(r[1]) if r else None

        if method == "GET" and qs.get("key"):
            return resp(200, {"publicKey": vapid_keys(cur)["public"]})

        if method == "GET" and qs.get("admin") == "1":
            if not is_admin:
                return resp(403, {"error": "Доступ только для администратора"})
            return resp(200, {"settings": load_settings(cur), **stats(cur)})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action in ("subscribe", "unsubscribe"):
            endpoint = str(body.get("endpoint", ""))[:1000]
            if not endpoint.startswith("https://"):
                return resp(400, {"error": "Некорректная подписка"})
            if action == "unsubscribe":
                cur.execute(f"SELECT id FROM {SCHEMA}.push_subscriptions WHERE endpoint = '{esc(endpoint)}'")
                row = cur.fetchone()
                if row:
                    cur.execute(f"DELETE FROM {SCHEMA}.push_queue WHERE sub_id = {row[0]}")
                    cur.execute(f"DELETE FROM {SCHEMA}.push_subscriptions WHERE id = {row[0]}")
                return resp(200, {"ok": True})
            keys = body.get("keys") or {}
            p256dh, auth = str(keys.get("p256dh", ""))[:200], str(keys.get("auth", ""))[:100]
            if not p256dh or not auth:
                return resp(400, {"error": "Некорректная подписка"})
            uid = me if me else "NULL"
            cur.execute(
                f"INSERT INTO {SCHEMA}.push_subscriptions (user_id, endpoint, p256dh, auth) "
                f"VALUES ({uid}, '{esc(endpoint)}', '{esc(p256dh)}', '{esc(auth)}') "
                f"ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, "
                f"user_id = COALESCE(EXCLUDED.user_id, {SCHEMA}.push_subscriptions.user_id)"
            )
            return resp(200, {"ok": True})

        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})

        if action == "settings":
            data = {k: bool(body.get(k, v)) for k, v in DEFAULT_PUSH.items()}
            cur.execute(
                f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('{SETTINGS_KEY}', '{esc(json.dumps(data))}', NOW()) "
                f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
            )
            return resp(200, {"settings": data})

        if action == "send":
            title = short(str(body.get("title", "")), 120)
            text = short(str(body.get("body", "")), 400)
            url = str(body.get("url", "")).strip() or "/m"
            if not (url.startswith("/") or url.startswith("https://")):
                return resp(400, {"error": "Ссылка должна начинаться с / или https://"})
            if len(title) < 2:
                return resp(400, {"error": "Заголовок — минимум 2 символа"})
            mid = create_message(cur, title, text, url)
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.push_queue WHERE message_id = {mid}")
            queued = int(cur.fetchone()[0])
            res = process_queue(cur, 30, 3.0) if queued else {"sent": 0, "left": 0}
            return resp(200, {"id": mid, "queued": queued, **res})

        if action == "process":
            return resp(200, process_queue(cur, 30, 3.2))

        if action == "retry":
            cur.execute(f"UPDATE {SCHEMA}.push_queue SET status = 'pending', attempts = 0, error = '' WHERE status = 'failed'")
            return resp(200, {"ok": True})

        if action == "delete-message":
            mid = int(body.get("id", 0) or 0)
            cur.execute(f"DELETE FROM {SCHEMA}.push_queue WHERE message_id = {mid} AND status = 'pending'")
            return resp(200, {"ok": True})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
