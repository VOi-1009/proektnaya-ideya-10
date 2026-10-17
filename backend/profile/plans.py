import json
import os
import re
from datetime import datetime, timedelta

import psycopg2

from status import level_for, points_sql

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
TIER_NAMES = {1: "Бронза", 2: "Серебро", 3: "Золото"}
DEFAULT_PLANS = {"prices": {"1": 99, "2": 199, "3": 299}, "days": 30}


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def load_plans(cur) -> dict:
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'plans'")
    r = cur.fetchone()
    data = json.loads(r[0]) if r else {}
    prices = {**DEFAULT_PLANS["prices"], **(data.get("prices") or {})}
    return {"prices": {k: int(v) for k, v in prices.items()}, "days": int(data.get("days") or 30)}


def viewer(cur, token: str) -> dict:
    v = {"id": None, "admin": False, "tier": 0, "level": 0, "supporter": False}
    if not token:
        return v
    cur.execute(
        f"SELECT u.id, u.is_admin, {points_sql(SCHEMA)}, u.status_override, u.supporter_no, u.is_creator, "
        f"(SELECT sb.tier FROM {SCHEMA}.subscriptions sb WHERE sb.user_id = u.id AND sb.expires_at > NOW()) "
        f"FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token = '{token}' AND s.expires_at > NOW()"
    )
    r = cur.fetchone()
    if not r:
        return v
    return {
        "id": int(r[0]), "admin": bool(r[1]), "level": level_for(int(r[2]), r[3])["level"],
        "supporter": bool(r[4] or r[5]), "tier": int(r[6] or 0),
    }


def sub_item(r) -> dict:
    return {"userId": r[0], "tier": r[1], "expiresAt": r[2].isoformat(), "mailOn": bool(r[3])}


def grant(cur, uid: int, tier: int, days: int) -> None:
    cur.execute(f"SELECT expires_at, tier FROM {SCHEMA}.subscriptions WHERE user_id = {uid} AND expires_at > NOW()")
    cur_sub = cur.fetchone()
    if cur_sub:
        cur.execute(
            f"UPDATE {SCHEMA}.subscriptions SET tier = {tier}, expires_at = expires_at + INTERVAL '{days} days', updated_at = NOW() WHERE user_id = {uid}"
        )
    else:
        cur.execute(
            f"INSERT INTO {SCHEMA}.subscriptions (user_id, tier, expires_at) VALUES ({uid}, {tier}, NOW() + INTERVAL '{days} days') "
            f"ON CONFLICT (user_id) DO UPDATE SET tier = {tier}, expires_at = NOW() + INTERVAL '{days} days', updated_at = NOW()"
        )


def handle_plans(event: dict) -> dict:
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
        plans = load_plans(cur)

        if method == "GET" and qs.get("admin") == "1":
            if not is_admin:
                return resp(403, {"error": "Доступ только для администратора"})
            cur.execute(
                f"SELECT r.id, r.tier, r.amount, r.comment, r.status, r.created_at, u.id, u.name, u.email, u.avatar_url "
                f"FROM {SCHEMA}.subscription_requests r JOIN {SCHEMA}.users u ON u.id = r.user_id "
                f"ORDER BY (r.status = 'pending') DESC, r.id DESC LIMIT 200"
            )
            from users import display_name
            requests = [{
                "id": x[0], "tier": x[1], "amount": x[2], "comment": x[3], "status": x[4], "createdAt": x[5].isoformat(),
                "user": {"id": x[6], "name": display_name(x[7], x[8]), "avatar": x[9] or "", "email": "" if (x[8] or "").endswith(".traderka.ru") else (x[8] or "")},
            } for x in cur.fetchall()]
            cur.execute(
                f"SELECT s.user_id, s.tier, s.expires_at, s.mail_on, u.name, u.email, u.avatar_url, (s.expires_at > NOW()) "
                f"FROM {SCHEMA}.subscriptions s JOIN {SCHEMA}.users u ON u.id = s.user_id ORDER BY (s.expires_at > NOW()) DESC, s.tier DESC, s.expires_at DESC LIMIT 300"
            )
            subs = [{
                "userId": x[0], "tier": x[1], "expiresAt": x[2].isoformat(), "mailOn": bool(x[3]),
                "name": display_name(x[4], x[5]), "email": "" if (x[5] or "").endswith(".traderka.ru") else (x[5] or ""),
                "avatar": x[6] or "", "active": bool(x[7]),
            } for x in cur.fetchall()]
            cur.execute(f"SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM {SCHEMA}.subscription_requests WHERE status = 'approved'")
            rev = cur.fetchone()
            return resp(200, {
                "plans": plans, "requests": requests, "subscribers": subs,
                "stats": {"revenue": int(rev[0]), "payments": int(rev[1]), "active": sum(1 for s in subs if s["active"]),
                          "pending": sum(1 for r in requests if r["status"] == "pending")},
            })

        if method == "GET":
            out = {"plans": plans, "me": None}
            if me:
                cur.execute(f"SELECT user_id, tier, expires_at, mail_on FROM {SCHEMA}.subscriptions WHERE user_id = {me} AND expires_at > NOW()")
                s = cur.fetchone()
                cur.execute(f"SELECT id, tier, status, created_at FROM {SCHEMA}.subscription_requests WHERE user_id = {me} ORDER BY id DESC LIMIT 1")
                last = cur.fetchone()
                out["me"] = {
                    "sub": sub_item(s) if s else None,
                    "last": {"id": last[0], "tier": last[1], "status": last[2], "createdAt": last[3].isoformat()} if last else None,
                    "tier": int(s[1]) if s else 0,
                }
            return resp(200, out)

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action in ("request", "mail-toggle"):
            if not me:
                return resp(401, {"error": "Войдите в аккаунт, чтобы оформить подписку"})
            if action == "mail-toggle":
                on = "TRUE" if body.get("on") else "FALSE"
                cur.execute(f"UPDATE {SCHEMA}.subscriptions SET mail_on = {on} WHERE user_id = {me}")
                return resp(200, {"ok": True})
            tier = int(body.get("tier", 0) or 0)
            if tier not in TIER_NAMES:
                return resp(400, {"error": "Выберите тариф"})
            comment = str(body.get("comment", "")).strip()[:500]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.subscription_requests WHERE user_id = {me} AND status = 'pending'")
            if int(cur.fetchone()[0]) >= 3:
                return resp(429, {"error": "У вас уже есть заявки на проверке — дождитесь подтверждения"})
            amount = plans["prices"][str(tier)]
            cur.execute(
                f"INSERT INTO {SCHEMA}.subscription_requests (user_id, tier, amount, comment) VALUES ({me}, {tier}, {amount}, '{esc(comment)}') RETURNING id"
            )
            return resp(200, {"id": cur.fetchone()[0]})

        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})

        if action in ("approve", "reject"):
            rid = int(body.get("id", 0) or 0)
            st = "approved" if action == "approve" else "rejected"
            cur.execute(
                f"UPDATE {SCHEMA}.subscription_requests SET status = '{st}', decided_at = NOW() WHERE id = {rid} AND status = 'pending' RETURNING user_id, tier"
            )
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Заявка не найдена или уже обработана"})
            if st == "approved":
                grant(cur, int(r[0]), int(r[1]), plans["days"])
            return resp(200, {"status": st})

        if action == "grant":
            uid = int(body.get("userId", 0) or 0)
            tier = int(body.get("tier", 0) or 0)
            days = max(1, min(int(body.get("days", plans["days"]) or plans["days"]), 3650))
            if tier not in TIER_NAMES:
                return resp(400, {"error": "Выберите тариф"})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.users WHERE id = {uid}")
            if not cur.fetchone():
                return resp(404, {"error": "Пользователь не найден"})
            grant(cur, uid, tier, days)
            return resp(200, {"ok": True})

        if action == "revoke":
            cur.execute(f"UPDATE {SCHEMA}.subscriptions SET expires_at = NOW() WHERE user_id = {int(body.get('userId', 0) or 0)}")
            return resp(200, {"ok": True})

        if action == "settings":
            prices = body.get("prices") or {}
            data = {
                "prices": {k: max(1, min(int(prices.get(k, plans["prices"][k]) or 1), 1000000)) for k in ("1", "2", "3")},
                "days": max(1, min(int(body.get("days", 30) or 30), 365)),
            }
            val = esc(json.dumps(data, ensure_ascii=False))
            cur.execute(
                f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('plans', '{val}', NOW()) "
                f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
            )
            return resp(200, {"plans": data})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
