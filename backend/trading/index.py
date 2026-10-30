import json
import os
import re
import time
import urllib.request

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
START = 10000.0
MAX_LEV = 20
MIN_MARGIN = 10.0
COINS = ["bitcoin", "ethereum", "binancecoin", "ripple", "solana", "dogecoin", "hyperliquid", "zcash", "tron", "cardano", "chainlink", "stellar", "avalanche-2", "sui", "shiba-inu", "the-open-network", "hedera-hashgraph", "litecoin"]
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
_cache = {"at": 0.0, "data": {}}


def resp(status, body):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(body, ensure_ascii=False)}


def prices():
    now = time.time()
    if _cache["data"] and now - _cache["at"] < 20:
        return _cache["data"]
    try:
        url = "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=" + ",".join(COINS)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=4) as r:
            d = json.loads(r.read())
        data = {k: float(v["usd"]) for k, v in d.items() if v.get("usd")}
        if data:
            _cache.update(at=now, data={**_cache["data"], **data})
    except Exception as e:
        print("price error:", e)
    return _cache["data"]


def pnl_of(side, entry, size, price):
    return (price - entry) * size if side == "long" else (entry - price) * size


def process(cur, user_id, px):
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, limit_price FROM {SCHEMA}.paper_orders WHERE user_id = {user_id} AND status = 'pending'")
    for oid, coin, side, lev, margin, lim in cur.fetchall():
        p = px.get(coin)
        if not p:
            continue
        lim = float(lim)
        if (side == "long" and p <= lim) or (side == "short" and p >= lim):
            size = float(margin) * lev / lim
            cur.execute(f"INSERT INTO {SCHEMA}.paper_positions (user_id, coin_id, side, leverage, margin, size, entry_price) VALUES ({user_id}, '{coin}', '{side}', {lev}, {float(margin)}, {size}, {lim})")
            cur.execute(f"UPDATE {SCHEMA}.paper_orders SET status = 'filled', done_at = NOW() WHERE id = {oid}")
    cur.execute(f"SELECT id, coin_id, side, margin, size, entry_price FROM {SCHEMA}.paper_positions WHERE user_id = {user_id} AND status = 'open'")
    for pid, coin, side, margin, size, entry in cur.fetchall():
        p = px.get(coin)
        if not p:
            continue
        pnl = pnl_of(side, float(entry), float(size), p)
        if pnl <= -float(margin) * 0.95:
            cur.execute(f"UPDATE {SCHEMA}.paper_positions SET status = 'closed', close_price = {p}, pnl = {-float(margin)}, close_reason = 'liquidation', closed_at = NOW() WHERE id = {pid}")


def state(cur, user_id, px):
    cur.execute(f"INSERT INTO {SCHEMA}.paper_accounts (user_id) VALUES ({user_id}) ON CONFLICT (user_id) DO NOTHING")
    process(cur, user_id, px)
    cur.execute(f"SELECT balance, resets FROM {SCHEMA}.paper_accounts WHERE user_id = {user_id}")
    balance, resets = cur.fetchone()
    balance = float(balance)
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, size, entry_price, opened_at FROM {SCHEMA}.paper_positions WHERE user_id = {user_id} AND status = 'open' ORDER BY id DESC")
    positions = []
    locked = 0.0
    unreal = 0.0
    for pid, coin, side, lev, margin, size, entry, at in cur.fetchall():
        margin, size, entry = float(margin), float(size), float(entry)
        p = px.get(coin, entry)
        pnl = pnl_of(side, entry, size, p)
        locked += margin
        unreal += pnl
        liq = entry * (1 - 0.95 / lev) if side == "long" else entry * (1 + 0.95 / lev)
        positions.append({"id": pid, "coinId": coin, "side": side, "leverage": lev, "margin": margin, "size": size, "entry": entry, "price": p, "pnl": pnl, "liq": liq, "openedAt": at.isoformat()})
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, limit_price, created_at FROM {SCHEMA}.paper_orders WHERE user_id = {user_id} AND status = 'pending' ORDER BY id DESC")
    orders = []
    for oid, coin, side, lev, margin, lim, at in cur.fetchall():
        locked += float(margin)
        orders.append({"id": oid, "coinId": coin, "side": side, "leverage": lev, "margin": float(margin), "limit": float(lim), "createdAt": at.isoformat()})
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, entry_price, close_price, pnl, close_reason, closed_at FROM {SCHEMA}.paper_positions WHERE user_id = {user_id} AND status = 'closed' ORDER BY closed_at DESC LIMIT 50")
    history = [{"id": r[0], "coinId": r[1], "side": r[2], "leverage": r[3], "margin": float(r[4]), "entry": float(r[5]), "close": float(r[6]), "pnl": float(r[7]), "reason": r[8], "closedAt": r[9].isoformat()} for r in cur.fetchall()]
    equity = balance + locked + unreal
    return {"balance": balance, "equity": equity, "locked": locked, "unrealized": unreal, "resets": resets, "start": START, "positions": positions, "orders": orders, "history": history, "prices": px}


def leaderboard(cur, px):
    cur.execute(f"SELECT a.user_id, a.balance, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)), u.avatar_url FROM {SCHEMA}.paper_accounts a JOIN {SCHEMA}.users u ON u.id = a.user_id")
    users = {r[0]: {"userId": r[0], "equity": float(r[1]), "name": r[2], "avatar": r[3] or "", "trades": 0} for r in cur.fetchall()}
    cur.execute(f"SELECT user_id, coin_id, side, margin, size, entry_price FROM {SCHEMA}.paper_positions WHERE status = 'open'")
    for uid, coin, side, margin, size, entry in cur.fetchall():
        if uid in users:
            p = px.get(coin, float(entry))
            users[uid]["equity"] += max(float(margin) + pnl_of(side, float(entry), float(size), p), 0)
    cur.execute(f"SELECT user_id, COALESCE(SUM(margin), 0) FROM {SCHEMA}.paper_orders WHERE status = 'pending' GROUP BY user_id")
    for uid, m in cur.fetchall():
        if uid in users:
            users[uid]["equity"] += float(m)
    cur.execute(f"SELECT user_id, COUNT(*) FROM {SCHEMA}.paper_positions WHERE status = 'closed' GROUP BY user_id")
    for uid, c in cur.fetchall():
        if uid in users:
            users[uid]["trades"] = c
    rows = sorted(users.values(), key=lambda x: -x["equity"])[:20]
    for r in rows:
        r["profitPct"] = (r["equity"] - START) / START * 100
    return rows


def handler(event, context):
    """Тренировочная биржа: виртуальный счёт, рыночные и лимитные ордера, плечо, шорт, рейтинг"""
    method = event.get("httpMethod", "GET")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}
    qs = event.get("queryStringParameters") or {}
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    action = qs.get("action", "state")
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        px = prices()
        if method == "GET" and action == "leaderboard":
            return resp(200, {"leaders": leaderboard(cur, px)})
        if not token:
            return resp(401, {"error": "Войдите, чтобы торговать на тренировочной бирже"})
        cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = '{token}' AND expires_at > NOW()")
        row = cur.fetchone()
        if not row:
            return resp(401, {"error": "Сессия истекла, войдите заново"})
        uid = int(row[0])
        if method == "GET":
            return resp(200, state(cur, uid, px))
        body = json.loads(event.get("body") or "{}")
        act = body.get("action")
        cur.execute(f"INSERT INTO {SCHEMA}.paper_accounts (user_id) VALUES ({uid}) ON CONFLICT (user_id) DO NOTHING")
        process(cur, uid, px)
        if act in ("open", "limit"):
            coin = str(body.get("coinId", ""))
            side = body.get("side")
            try:
                lev = int(body.get("leverage", 1))
                margin = float(body.get("margin", 0))
            except (TypeError, ValueError):
                return resp(400, {"error": "Неверные параметры"})
            if coin not in COINS or side not in ("long", "short"):
                return resp(400, {"error": "Неверная монета или направление"})
            if lev < 1 or lev > MAX_LEV:
                return resp(400, {"error": f"Плечо от 1 до {MAX_LEV}"})
            if margin < MIN_MARGIN:
                return resp(400, {"error": f"Минимальная сумма сделки {int(MIN_MARGIN)} $"})
            cur.execute(f"SELECT balance FROM {SCHEMA}.paper_accounts WHERE user_id = {uid}")
            if margin > float(cur.fetchone()[0]) + 1e-9:
                return resp(400, {"error": "Недостаточно средств на счёте"})
            if act == "open":
                p = px.get(coin)
                if not p:
                    return resp(503, {"error": "Курс сейчас недоступен, попробуйте через минуту"})
                size = margin * lev / p
                cur.execute(f"INSERT INTO {SCHEMA}.paper_positions (user_id, coin_id, side, leverage, margin, size, entry_price) VALUES ({uid}, '{coin}', '{side}', {lev}, {margin}, {size}, {p})")
            else:
                try:
                    lim = float(body.get("limit", 0))
                except (TypeError, ValueError):
                    lim = 0
                if lim <= 0:
                    return resp(400, {"error": "Укажите цену ордера"})
                cur.execute(f"INSERT INTO {SCHEMA}.paper_orders (user_id, coin_id, side, leverage, margin, limit_price) VALUES ({uid}, '{coin}', '{side}', {lev}, {margin}, {lim})")
            cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance - {margin} WHERE user_id = {uid}")
            process(cur, uid, px)
        elif act == "close":
            pid = int(body.get("id", 0))
            cur.execute(f"SELECT coin_id, side, margin, size, entry_price FROM {SCHEMA}.paper_positions WHERE id = {pid} AND user_id = {uid} AND status = 'open'")
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Позиция не найдена"})
            p = px.get(r[0])
            if not p:
                return resp(503, {"error": "Курс сейчас недоступен, попробуйте через минуту"})
            margin = float(r[2])
            pnl = max(pnl_of(r[1], float(r[4]), float(r[3]), p), -margin)
            cur.execute(f"UPDATE {SCHEMA}.paper_positions SET status = 'closed', close_price = {p}, pnl = {pnl}, close_reason = 'manual', closed_at = NOW() WHERE id = {pid}")
            cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance + {margin + pnl} WHERE user_id = {uid}")
        elif act == "cancel":
            oid = int(body.get("id", 0))
            cur.execute(f"SELECT margin FROM {SCHEMA}.paper_orders WHERE id = {oid} AND user_id = {uid} AND status = 'pending'")
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Ордер не найден"})
            cur.execute(f"UPDATE {SCHEMA}.paper_orders SET status = 'cancelled', done_at = NOW() WHERE id = {oid}")
            cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance + {float(r[0])} WHERE user_id = {uid}")
        elif act == "reset":
            cur.execute(f"UPDATE {SCHEMA}.paper_positions SET status = 'closed', close_price = entry_price, pnl = 0, close_reason = 'reset', closed_at = NOW() WHERE user_id = {uid} AND status = 'open'")
            cur.execute(f"UPDATE {SCHEMA}.paper_orders SET status = 'cancelled', done_at = NOW() WHERE user_id = {uid} AND status = 'pending'")
            cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = {START}, resets = resets + 1, reset_at = NOW() WHERE user_id = {uid}")
        else:
            return resp(400, {"error": "Неизвестное действие"})
        return resp(200, state(cur, uid, px))
    finally:
        cur.close()
        conn.close()
