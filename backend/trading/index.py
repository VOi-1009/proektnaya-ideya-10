import datetime
import json
import os
import re
import time
import urllib.request

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
START = 1000.0
MAX_LEV = 100
MIN_MARGIN = 1.0
MIN_EXCHANGE = 1.0
FEE_RATE = 0.0005
COINS = ["bitcoin", "ethereum", "binancecoin", "ripple", "solana", "dogecoin", "hyperliquid", "zcash", "tron", "cardano", "chainlink", "stellar", "avalanche-2", "sui", "shiba-inu", "the-open-network", "hedera-hashgraph", "litecoin"]
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
_cache = {"at": 0.0, "data": {}}
_kcache = {}
_top = {"at": 0.0, "data": None}
_feed = {"at": 0.0, "data": None}
_cosm = {"at": 0.0, "data": None}
SYM = {"bitcoin": "BTC", "ethereum": "ETH", "binancecoin": "BNB", "ripple": "XRP", "solana": "SOL", "dogecoin": "DOGE", "hyperliquid": "HYPE", "zcash": "ZEC", "tron": "TRX", "cardano": "ADA", "chainlink": "LINK", "stellar": "XLM", "avalanche-2": "AVAX", "sui": "SUI", "shiba-inu": "SHIB", "the-open-network": "TON", "hedera-hashgraph": "HBAR", "litecoin": "LTC"}
OKX_BAR = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "1H", "4h": "4H", "1d": "1D"}
BYBIT_IV = {"1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D"}
KCACHE_TTL = 20


def http_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=3) as r:
        return json.loads(r.read())


def k_okx(sym, iv):
    d = http_json(f"https://www.okx.com/api/v5/market/candles?instId={sym}-USDT&bar={OKX_BAR[iv]}&limit=300")
    rows = d.get("data") or []
    return [[int(r[0]), float(r[1]), float(r[2]), float(r[3]), float(r[4]), float(r[5])] for r in reversed(rows)]


def k_bybit(sym, iv):
    d = http_json(f"https://api.bybit.com/v5/market/kline?category=spot&symbol={sym}USDT&interval={BYBIT_IV[iv]}&limit=500")
    rows = (d.get("result") or {}).get("list") or []
    return [[int(r[0]), float(r[1]), float(r[2]), float(r[3]), float(r[4]), float(r[5])] for r in reversed(rows)]


def k_binance(sym, iv):
    for host in ("https://data-api.binance.vision", "https://api.binance.com"):
        try:
            rows = http_json(f"{host}/api/v3/klines?symbol={sym}USDT&interval={iv}&limit=500")
            if rows:
                return [[int(r[0]), float(r[1]), float(r[2]), float(r[3]), float(r[4]), float(r[5])] for r in rows]
        except Exception as e:
            print("binance error:", e)
    return []


def candles(coin, iv):
    sym = SYM.get(coin)
    if not sym or iv not in OKX_BAR:
        return None
    key = f"{coin}:{iv}"
    hit = _kcache.get(key)
    now = time.time()
    if hit and now - hit["at"] < KCACHE_TTL:
        return hit
    for name, fn in (("okx", k_okx), ("bybit", k_bybit), ("binance", k_binance)):
        try:
            rows = fn(sym, iv)
            if len(rows) > 5:
                out = {"at": now, "source": name, "candles": rows}
                _kcache[key] = out
                return out
        except Exception as e:
            print(name, "error:", e)
    return hit



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


def sql_num(v):
    return "NULL" if v is None else repr(float(v))


def ensure_account(cur, uid):
    cur.execute(f"INSERT INTO {SCHEMA}.paper_accounts (user_id, balance) VALUES ({uid}, 0) ON CONFLICT (user_id) DO NOTHING RETURNING user_id")
    if cur.fetchone():
        cur.execute(f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({uid}, {START}, 'bonus', 'Стартовый бонус')")


def tka_balance(cur, uid):
    cur.execute(f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.tka_ledger WHERE user_id = {uid}")
    return float(cur.fetchone()[0])


def usdt_deposits(cur, uid):
    cur.execute(f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.usdt_ledger WHERE user_id = {uid}")
    return float(cur.fetchone()[0])


def usdt_gross(cur, uid):
    cur.execute(f"SELECT COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) FROM {SCHEMA}.usdt_ledger WHERE user_id = {uid}")
    return float(cur.fetchone()[0])


FUND_KEY = "fund_settings"
FUND_DEFAULT = {
    "title": "Фонд TRADERKA",
    "description": "В фонд идёт комиссия с каждого обмена TKA и виртуальных USDT и с каждой сделки на бирже. Из фонда будут призы и награды для участников.",
    "goal": 0,
    "feePercent": 0.05,
}


def q(v):
    return str(v).replace("'", "''").replace("\\", "")


def qj(v):
    return str(v).replace("'", "''")


def fund_settings(cur):
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{FUND_KEY}'")
    row = cur.fetchone()
    out = dict(FUND_DEFAULT)
    if row and row[0]:
        try:
            out.update({k: v for k, v in json.loads(row[0]).items() if k in FUND_DEFAULT})
        except ValueError:
            pass
    return out


def fee_rate(cur):
    try:
        pct = float(fund_settings(cur)["feePercent"])
    except (TypeError, ValueError):
        pct = FEE_RATE * 100
    return max(0.0, min(pct, 5.0)) / 100


EX_KEY = "exchange_settings"
EX_DEFAULT = {"enabled": True, "message": "", "maxLeverage": 100, "minMargin": 1.0, "feePercent": 0.05, "feeBase": "volume", "disabledCoins": []}


def exchange_settings(cur):
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{EX_KEY}'")
    row = cur.fetchone()
    raw = {}
    if row and row[0]:
        try:
            raw = json.loads(row[0])
        except ValueError:
            raw = {}
    out = dict(EX_DEFAULT)
    try:
        out["enabled"] = bool(raw.get("enabled", True))
        out["message"] = str(raw.get("message") or "")[:200]
        out["maxLeverage"] = max(1, min(int(raw.get("maxLeverage", MAX_LEV)), MAX_LEV))
        out["minMargin"] = max(0.01, min(float(raw.get("minMargin", MIN_MARGIN)), 1000000.0))
        out["feePercent"] = max(0.0, min(float(raw.get("feePercent", 0.05)), 1.0))
        out["feeBase"] = "margin" if raw.get("feeBase") == "margin" else "volume"
        out["disabledCoins"] = [c for c in (raw.get("disabledCoins") or []) if c in COINS]
    except (TypeError, ValueError):
        pass
    return out


def trade_fee(ex, margin, lev):
    base = margin * lev if ex["feeBase"] == "volume" else margin
    return round(base * ex["feePercent"] / 100, 4)


def fund_total(cur):
    cur.execute(f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.fund_ledger")
    return float(cur.fetchone()[0])


def fund_state(cur, uid=None):
    st = fund_settings(cur)
    cur.execute(f"SELECT COUNT(*) FILTER (WHERE kind = 'fee'), COUNT(DISTINCT user_id) FROM {SCHEMA}.fund_ledger WHERE kind IN ('fee', 'donation')")
    cnt, donors = cur.fetchone()
    mine = 0.0
    fees_paid = 0.0
    fees_trades = 0.0
    fees_exchange = 0.0
    if uid:
        cur.execute(
            f"SELECT COALESCE(SUM(amount) FILTER (WHERE kind IN ('fee', 'donation')), 0), "
            f"COALESCE(SUM(amount) FILTER (WHERE kind = 'fee'), 0), "
            f"COALESCE(SUM(amount) FILTER (WHERE kind = 'fee' AND note LIKE 'Комиссия сделки%'), 0) "
            f"FROM {SCHEMA}.fund_ledger WHERE user_id = {int(uid)}"
        )
        r_ = cur.fetchone()
        mine, fees_paid, fees_trades = float(r_[0]), float(r_[1]), float(r_[2])
        fees_exchange = fees_paid - fees_trades
    cur.execute(
        f"SELECT f.amount, f.kind, f.note, f.created_at, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1), '') "
        f"FROM {SCHEMA}.fund_ledger f LEFT JOIN {SCHEMA}.users u ON u.id = f.user_id ORDER BY f.id DESC LIMIT 15"
    )
    last = [{"amount": float(r[0]), "kind": r[1], "note": r[2], "at": r[3].isoformat(), "user": r[4] or ""} for r in cur.fetchall()]
    cur.execute(
        f"SELECT COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)), SUM(f.amount) AS s FROM {SCHEMA}.fund_ledger f "
        f"JOIN {SCHEMA}.users u ON u.id = f.user_id WHERE f.kind IN ('fee', 'donation') GROUP BY f.user_id, u.name, u.email ORDER BY s DESC LIMIT 5"
    )
    top = [{"name": r[0], "amount": float(r[1])} for r in cur.fetchall()]
    cur.execute(f"SELECT CURRENT_DATE")
    today = cur.fetchone()[0]
    cur.execute(f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.fund_ledger WHERE created_at < CURRENT_DATE - 29")
    run = float(cur.fetchone()[0])
    cur.execute(f"SELECT created_at::date, SUM(amount) FROM {SCHEMA}.fund_ledger WHERE created_at >= CURRENT_DATE - 29 GROUP BY 1")
    per_day = {r[0]: float(r[1]) for r in cur.fetchall()}
    chart = []
    for i in range(29, -1, -1):
        d = today - datetime.timedelta(days=i)
        inc = per_day.get(d, 0.0)
        run += inc
        chart.append({"d": d.isoformat(), "total": round(run, 2), "in": round(max(inc, 0.0), 2)})
    cur.execute(
        f"SELECT c.id, c.title, c.prize, c.finished_at, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)), c.winner_id, u.avatar_url "
        f"FROM {SCHEMA}.contests c JOIN {SCHEMA}.users u ON u.id = c.winner_id WHERE c.status = 'finished' AND c.winner_id IS NOT NULL "
        f"ORDER BY c.finished_at DESC LIMIT 10"
    )
    winners = [{"id": r[0], "title": r[1], "prize": float(r[2]), "at": r[3].isoformat() if r[3] else None, "name": r[4], "userId": r[5], "avatar": r[6] or ""} for r in cur.fetchall()]
    return {
        "chart": chart, "winners": winners,
        "total": fund_total(cur), "count": int(cnt), "donors": int(donors), "mine": mine, "feesPaid": fees_paid, "feesTrades": fees_trades, "feesExchange": fees_exchange, "rate": fee_rate(cur),
        "title": st["title"], "description": st["description"], "goal": float(st["goal"] or 0), "last": last, "top": top,
    }


ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T[\d:.]+Z$")
CONTEST_KINDS = {"random": "Розыгрыш среди участников", "trader": "Лучший трейдер (по прибыли в виртуальных USDT)"}


def finish_contest(cur, cid, force=False):
    cond = "" if force else "AND ends_at <= NOW()"
    cur.execute(f"UPDATE {SCHEMA}.contests SET status = 'finished', finished_at = NOW() WHERE id = {int(cid)} AND status = 'active' {cond} RETURNING title, kind, prize, starts_at")
    row = cur.fetchone()
    if not row:
        return None
    title, kind, prize, starts = row
    prize = float(prize)
    winner = None
    if kind == "trader":
        cur.execute(
            f"SELECT e.user_id, COALESCE(SUM(p.pnl), 0) AS s FROM {SCHEMA}.contest_entries e "
            f"LEFT JOIN {SCHEMA}.paper_positions p ON p.user_id = e.user_id AND p.status = 'closed' AND COALESCE(p.close_reason, '') <> 'reset' "
            f"AND p.closed_at >= '{starts.isoformat()}'::timestamptz WHERE e.contest_id = {int(cid)} GROUP BY e.user_id ORDER BY s DESC, e.user_id LIMIT 1"
        )
        r = cur.fetchone()
        if r and float(r[1]) > 0:
            winner = int(r[0])
    else:
        cur.execute(f"SELECT user_id FROM {SCHEMA}.contest_entries WHERE contest_id = {int(cid)} ORDER BY random() LIMIT 1")
        r = cur.fetchone()
        if r:
            winner = int(r[0])
    if winner:
        cur.execute(f"UPDATE {SCHEMA}.contests SET winner_id = {winner} WHERE id = {int(cid)}")
        note = q(f"Приз конкурса «{title}»")[:120]
        cur.execute(f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({winner}, {prize}, 'gift', '{note}')")
    else:
        note = q(f"Возврат приза: конкурс «{title}» без победителя")[:120]
        cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES (0, {prize}, 'deposit', '{note}')")
    return {"winner": winner}


def finish_due(cur):
    cur.execute(f"SELECT id FROM {SCHEMA}.contests WHERE status = 'active' AND ends_at <= NOW()")
    for (cid,) in cur.fetchall():
        finish_contest(cur, cid)


def contests_list(cur, uid):
    finish_due(cur)
    me = int(uid or 0)
    cur.execute(
        f"SELECT c.id, c.title, c.description, c.kind, c.prize, c.status, c.starts_at, c.ends_at, c.winner_id, "
        f"COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)), "
        f"(SELECT COUNT(*) FROM {SCHEMA}.contest_entries e WHERE e.contest_id = c.id), "
        f"EXISTS(SELECT 1 FROM {SCHEMA}.contest_entries e WHERE e.contest_id = c.id AND e.user_id = {me}) "
        f"FROM {SCHEMA}.contests c LEFT JOIN {SCHEMA}.users u ON u.id = c.winner_id "
        f"ORDER BY (c.status = 'active') DESC, CASE WHEN c.status = 'active' THEN c.ends_at END ASC, c.id DESC LIMIT 30"
    )
    return [
        {"id": r[0], "title": r[1], "description": r[2], "kind": r[3], "prize": float(r[4]), "status": r[5],
         "startsAt": r[6].isoformat(), "endsAt": r[7].isoformat(), "winnerId": r[8], "winner": r[9] or "",
         "entries": int(r[10]), "joined": bool(r[11])}
        for r in cur.fetchall()
    ]


def opt_uid(cur, token):
    if not token:
        return None
    cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = '{token}' AND expires_at > NOW()")
    r = cur.fetchone()
    return int(r[0]) if r else None


def is_admin(cur, uid):
    cur.execute(f"SELECT is_admin FROM {SCHEMA}.users WHERE id = {int(uid)}")
    r = cur.fetchone()
    return bool(r and r[0])


DAILY_REWARDS = [10, 15, 20, 25, 30, 40, 50]
TODAY = "(NOW() AT TIME ZONE 'Europe/Moscow')::date"


def daily_state(cur, uid):
    cur.execute(f"SELECT last_day = {TODAY}, last_day = {TODAY} - 1, streak FROM {SCHEMA}.tka_daily WHERE user_id = {uid}")
    row = cur.fetchone()
    if not row:
        streak, claimed = 0, False
        nxt = 1
    else:
        claimed, yesterday, streak = bool(row[0]), bool(row[1]), int(row[2])
        nxt = streak if claimed else (streak + 1 if yesterday else 1)
        if not claimed and not yesterday:
            streak = 0
    pos = min(nxt, len(DAILY_REWARDS))
    return {
        "claimed": claimed,
        "streak": streak,
        "nextDay": nxt,
        "reward": DAILY_REWARDS[pos - 1],
        "tomorrow": DAILY_REWARDS[min(nxt + 1, len(DAILY_REWARDS)) - 1] if claimed else DAILY_REWARDS[pos - 1],
        "rewards": DAILY_REWARDS,
    }


def process(cur, user_id, px):
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, limit_price, sl, tp, fee FROM {SCHEMA}.paper_orders WHERE user_id = {user_id} AND status = 'pending'")
    for oid, coin, side, lev, margin, lim, osl, otp, ofee in cur.fetchall():
        p = px.get(coin)
        if not p:
            continue
        lim = float(lim)
        if (side == "long" and p <= lim) or (side == "short" and p >= lim):
            size = float(margin) * lev / lim
            cur.execute(f"INSERT INTO {SCHEMA}.paper_positions (user_id, coin_id, side, leverage, margin, size, entry_price, sl, tp) VALUES ({user_id}, '{coin}', '{side}', {lev}, {float(margin)}, {size}, {lim}, {sql_num(osl)}, {sql_num(otp)})")
            cur.execute(f"UPDATE {SCHEMA}.paper_orders SET status = 'filled', done_at = NOW() WHERE id = {oid}")
            if float(ofee or 0) > 0:
                cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({user_id}, {float(ofee)}, 'fee', 'Комиссия сделки (лимитный ордер)')")
    cur.execute(f"SELECT id, coin_id, side, margin, size, entry_price, sl, tp FROM {SCHEMA}.paper_positions WHERE user_id = {user_id} AND status = 'open'")
    for pid, coin, side, margin, size, entry, sl, tp in cur.fetchall():
        p = px.get(coin)
        if not p:
            continue
        margin, size, entry = float(margin), float(size), float(entry)
        pnl = pnl_of(side, entry, size, p)
        if pnl <= -margin * 0.95:
            cur.execute(f"UPDATE {SCHEMA}.paper_positions SET status = 'closed', close_price = {p}, pnl = {-margin}, close_reason = 'liquidation', closed_at = NOW() WHERE id = {pid}")
            continue
        hit = None
        if sl is not None and ((side == "long" and p <= float(sl)) or (side == "short" and p >= float(sl))):
            hit = ("stop", float(sl))
        elif tp is not None and ((side == "long" and p >= float(tp)) or (side == "short" and p <= float(tp))):
            hit = ("take", float(tp))
        if hit:
            res = max(pnl_of(side, entry, size, hit[1]), -margin)
            cur.execute(f"UPDATE {SCHEMA}.paper_positions SET status = 'closed', close_price = {hit[1]}, pnl = {res}, close_reason = '{hit[0]}', closed_at = NOW() WHERE id = {pid}")
            cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance + {margin + res} WHERE user_id = {user_id}")


AWARDS = {"trade_first": 30, "trade_liq": 20, "trade_streak": 100, "trade_profit": 100}
TKA_REWARDS = {"trade_first": 50, "trade_liq": 25, "trade_streak": 200, "trade_profit": 300}
AWARD_NAMES = {"trade_first": "Первая сделка", "trade_liq": "Первая ликвидация", "trade_streak": "Серия из 5 плюсов", "trade_profit": "Профит +50%"}


def grant_awards(cur, uid):
    cur.execute(f"SELECT code FROM {SCHEMA}.paper_awards WHERE user_id = {uid}")
    have = {r[0] for r in cur.fetchall()}
    if len(have) >= len(AWARDS):
        return
    cur.execute(f"SELECT COUNT(*), COUNT(*) FILTER (WHERE close_reason = 'liquidation') FROM {SCHEMA}.paper_positions WHERE user_id = {uid}")
    total, liq = cur.fetchone()
    cur.execute(f"SELECT pnl, margin FROM {SCHEMA}.paper_positions WHERE user_id = {uid} AND status = 'closed' AND COALESCE(close_reason, '') <> 'reset' ORDER BY closed_at, id")
    streak = best = 0
    pct = 0.0
    for pnl, margin in cur.fetchall():
        pnl, margin = float(pnl or 0), float(margin or 0)
        streak = streak + 1 if pnl > 0 else 0
        best = max(best, streak)
        if margin > 0:
            pct = max(pct, pnl / margin * 100)
    got = {"trade_first": total >= 1, "trade_liq": liq >= 1, "trade_streak": best >= 5, "trade_profit": pct >= 50}
    for code, ok in got.items():
        if ok and code not in have:
            cur.execute(f"INSERT INTO {SCHEMA}.paper_awards (user_id, code, points) VALUES ({uid}, '{code}', {AWARDS[code]}) ON CONFLICT DO NOTHING RETURNING code")
            if cur.fetchone():
                cur.execute(f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({uid}, {TKA_REWARDS[code]}, 'reward', 'Достижение «{AWARD_NAMES[code]}»')")


def tick(cur, px):
    cur.execute(
        f"SELECT DISTINCT user_id FROM {SCHEMA}.paper_orders WHERE status = 'pending' AND user_id NOT IN (SELECT id FROM {SCHEMA}.users WHERE is_ai) "
        f"UNION SELECT DISTINCT user_id FROM {SCHEMA}.paper_positions WHERE status = 'open' AND user_id NOT IN (SELECT id FROM {SCHEMA}.users WHERE is_ai)"
    )
    ids = [r[0] for r in cur.fetchall()]
    for u in ids:
        process(cur, int(u), px)
        grant_awards(cur, int(u))
    return len(ids)


def build_stats(cur, user_id, equity, reset_at):
    base = usdt_deposits(cur, user_id)
    if usdt_gross(cur, user_id) <= 0:
        base = equity
    cur.execute(f"SELECT pnl, margin, closed_at FROM {SCHEMA}.paper_positions WHERE user_id = {user_id} AND status = 'closed' AND COALESCE(close_reason, '') <> 'reset' AND closed_at >= '{reset_at.isoformat()}' ORDER BY closed_at, id")
    tr = [(float(a or 0), float(b or 0), c) for a, b, c in cur.fetchall()]
    curve = [{"t": reset_at.isoformat(), "v": round(base, 2)}]
    run = base
    for pnl, _, at in tr:
        run += pnl
        curve.append({"t": at.isoformat(), "v": round(run, 2)})
    curve.append({"t": "now", "v": round(equity, 2)})
    pcts = [(a / b * 100) if b > 0 else 0 for a, b, _ in tr]
    return {
        "trades": len(tr),
        "wins": sum(1 for a, _, _ in tr if a > 0),
        "winRate": (sum(1 for a, _, _ in tr if a > 0) / len(tr) * 100) if tr else 0,
        "avgPnl": (sum(a for a, _, _ in tr) / len(tr)) if tr else 0,
        "avgPct": (sum(pcts) / len(pcts)) if pcts else 0,
        "best": max((a for a, _, _ in tr), default=0),
        "bestPct": max(pcts, default=0),
        "worst": min((a for a, _, _ in tr), default=0),
        "worstPct": min(pcts, default=0),
        "totalPnl": equity - base,
        "curve": curve,
    }


def public_stats(cur, uid, px):
    cur.execute(f"SELECT balance, reset_at FROM {SCHEMA}.paper_accounts WHERE user_id = {uid}")
    row = cur.fetchone()
    if not row:
        return None
    equity = float(row[0])
    cur.execute(f"SELECT coin_id, side, margin, size, entry_price FROM {SCHEMA}.paper_positions WHERE user_id = {uid} AND status = 'open'")
    for coin, side, margin, size, entry in cur.fetchall():
        equity += max(float(margin) + pnl_of(side, float(entry), float(size), px.get(coin, float(entry))), 0)
    cur.execute(f"SELECT COALESCE(SUM(margin), 0) FROM {SCHEMA}.paper_orders WHERE user_id = {uid} AND status = 'pending'")
    equity += float(cur.fetchone()[0])
    st = build_stats(cur, uid, equity, row[1])
    return st if st["trades"] > 0 else None


def public_trades(cur, uid, px):
    out = []
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, size, entry_price, opened_at FROM {SCHEMA}.paper_positions WHERE user_id = {uid} AND status = 'open' ORDER BY id DESC LIMIT 5")
    for pid, coin, side, lev, margin, size, entry, at in cur.fetchall():
        margin, size, entry = float(margin), float(size), float(entry)
        price = px.get(coin, entry)
        pnl = pnl_of(side, entry, size, price)
        out.append({"id": pid, "coinId": coin, "side": side, "leverage": lev, "entry": entry, "price": price, "pct": pnl / margin * 100 if margin else 0, "open": True, "at": at.isoformat()})
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, entry_price, close_price, pnl, closed_at FROM {SCHEMA}.paper_positions WHERE user_id = {uid} AND status = 'closed' AND COALESCE(close_reason, '') <> 'reset' ORDER BY closed_at DESC LIMIT 5")
    for pid, coin, side, lev, margin, entry, close, pnl, at in cur.fetchall():
        margin = float(margin)
        out.append({"id": pid, "coinId": coin, "side": side, "leverage": lev, "entry": float(entry), "price": float(close), "pct": float(pnl) / margin * 100 if margin else 0, "open": False, "at": at.isoformat()})
    return out


def top_trades_feed(cur, limit=20):
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE is_ai")
    ai_ids = {int(r[0]) for r in cur.fetchall()}
    tops = [int(r["userId"]) for r in leaderboard(cur, prices()) if r["pnl"] > 0][:3]
    if not tops:
        return {"feed": [], "tops": []}
    ids = ", ".join(str(i) for i in tops)
    cur.execute(
        f"SELECT p.id, p.user_id, p.coin_id, p.side, p.leverage, p.margin, p.entry_price, p.close_price, p.pnl, p.close_reason, p.closed_at, "
        f"COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) "
        f"FROM {SCHEMA}.paper_positions p JOIN {SCHEMA}.users u ON u.id = p.user_id "
        f"WHERE p.user_id IN ({ids}) AND p.status = 'closed' AND COALESCE(p.close_reason, '') <> 'reset' "
        f"ORDER BY p.closed_at DESC, p.id DESC LIMIT {int(limit)}"
    )
    feed = []
    for r in cur.fetchall():
        margin, pnl = float(r[5]), float(r[8] or 0)
        feed.append({
            "id": r[0], "userId": r[1], "name": r[11], "coinId": r[2], "side": r[3], "leverage": r[4], "margin": margin,
            "entry": float(r[6]), "close": float(r[7] or 0), "pnl": pnl, "pct": pnl / margin * 100 if margin else 0.0,
            "reason": r[9], "at": r[10].isoformat(), "isAi": r[1] in ai_ids, "place": tops.index(r[1]) + 1,
        })
    return {"feed": feed, "tops": tops}


def state(cur, user_id, px):
    ensure_account(cur, user_id)
    process(cur, user_id, px)
    grant_awards(cur, user_id)
    cur.execute(f"SELECT balance, resets, reset_at FROM {SCHEMA}.paper_accounts WHERE user_id = {user_id}")
    balance, resets, reset_at = cur.fetchone()
    balance = float(balance)
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, size, entry_price, opened_at, sl, tp FROM {SCHEMA}.paper_positions WHERE user_id = {user_id} AND status = 'open' ORDER BY id DESC")
    positions = []
    locked = 0.0
    unreal = 0.0
    for pid, coin, side, lev, margin, size, entry, at, sl, tp in cur.fetchall():
        margin, size, entry = float(margin), float(size), float(entry)
        p = px.get(coin, entry)
        pnl = pnl_of(side, entry, size, p)
        locked += margin
        unreal += pnl
        liq = entry * (1 - 0.95 / lev) if side == "long" else entry * (1 + 0.95 / lev)
        positions.append({"id": pid, "coinId": coin, "side": side, "leverage": lev, "margin": margin, "size": size, "entry": entry, "price": p, "pnl": pnl, "liq": liq, "sl": float(sl) if sl is not None else None, "tp": float(tp) if tp is not None else None, "openedAt": at.isoformat()})
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, limit_price, created_at, sl, tp FROM {SCHEMA}.paper_orders WHERE user_id = {user_id} AND status = 'pending' ORDER BY id DESC")
    orders = []
    for oid, coin, side, lev, margin, lim, at, sl, tp in cur.fetchall():
        locked += float(margin)
        orders.append({"id": oid, "coinId": coin, "side": side, "leverage": lev, "margin": float(margin), "limit": float(lim), "sl": float(sl) if sl is not None else None, "tp": float(tp) if tp is not None else None, "createdAt": at.isoformat()})
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, entry_price, close_price, pnl, close_reason, closed_at FROM {SCHEMA}.paper_positions WHERE user_id = {user_id} AND status = 'closed' ORDER BY closed_at DESC LIMIT 50")
    history = [{"id": r[0], "coinId": r[1], "side": r[2], "leverage": r[3], "margin": float(r[4]), "entry": float(r[5]), "close": float(r[6]), "pnl": float(r[7]), "reason": r[8], "closedAt": r[9].isoformat()} for r in cur.fetchall()]
    equity = balance + locked + unreal
    stats = build_stats(cur, user_id, equity, reset_at)
    return {"stats": stats, "balance": balance, "equity": equity, "locked": locked, "unrealized": unreal, "resets": resets, "start": (usdt_deposits(cur, user_id) if usdt_deposits(cur, user_id) > 0 else (usdt_gross(cur, user_id) or equity)), "tka": tka_balance(cur, user_id), "positions": positions, "orders": orders, "history": history, "prices": px}


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
    bases = {}
    gross = {}
    cur.execute(f"SELECT user_id, SUM(amount), COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) FROM {SCHEMA}.usdt_ledger GROUP BY user_id")
    for uid_, amt, g in cur.fetchall():
        bases[uid_] = float(amt)
        gross[uid_] = float(g)
    for uid_, r in users.items():
        g = gross.get(uid_, 0.0)
        r["pnl"] = r["equity"] - bases.get(uid_, 0.0) if g > 0 else 0.0
        r["profitPct"] = r["pnl"] / g * 100 if g > 0 else 0.0
    rows = sorted((r for uid_, r in users.items() if gross.get(uid_, 0) > 0), key=lambda x: -x["pnl"])[:20]
    return rows



AI_KEY = "ai_trader"
AI_RUN_KEY = "ai_trader_run"
AI_STRATEGIES = {"trend": "По тренду", "reversal": "Против движения", "long_only": "Только лонги"}
AI_POST_MIN_PCT = 3.0
AI_DEFAULT = {
    "enabled": False, "startBalance": 1000.0, "betPercent": 5.0, "maxBet": 200.0, "leverage": 3, "maxPositions": 3,
    "stopLossPct": 3.0, "takeProfitPct": 6.0, "holdHours": 6, "minMovePct": 1.5, "intervalMin": 15,
    "strategy": "trend", "coins": [], "postToCommunity": True, "postEvery": 3,
}


def clean_ai(raw):
    out = dict(AI_DEFAULT)
    try:
        out["enabled"] = bool(raw.get("enabled", False))
        out["startBalance"] = max(10.0, min(float(raw.get("startBalance", 1000)), 1000000.0))
        out["betPercent"] = max(0.5, min(float(raw.get("betPercent", 5)), 50.0))
        out["maxBet"] = max(1.0, min(float(raw.get("maxBet", 200)), 1000000.0))
        out["leverage"] = max(1, min(int(raw.get("leverage", 3)), MAX_LEV))
        out["maxPositions"] = max(1, min(int(raw.get("maxPositions", 3)), 10))
        out["stopLossPct"] = max(0.0, min(float(raw.get("stopLossPct", 3)), 50.0))
        out["takeProfitPct"] = max(0.0, min(float(raw.get("takeProfitPct", 6)), 200.0))
        out["holdHours"] = max(1, min(int(raw.get("holdHours", 6)), 168))
        out["minMovePct"] = max(0.0, min(float(raw.get("minMovePct", 1.5)), 50.0))
        out["intervalMin"] = max(5, min(int(raw.get("intervalMin", 15)), 720))
        out["strategy"] = raw.get("strategy") if raw.get("strategy") in AI_STRATEGIES else "trend"
        out["coins"] = [c for c in (raw.get("coins") or []) if c in COINS]
        out["postToCommunity"] = bool(raw.get("postToCommunity", True))
        out["postEvery"] = max(1, min(int(raw.get("postEvery", 3)), 50))
    except (TypeError, ValueError):
        pass
    return out


def ai_settings(cur):
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{AI_KEY}'")
    row = cur.fetchone()
    raw = {}
    if row and row[0]:
        try:
            raw = json.loads(row[0])
        except ValueError:
            raw = {}
    return clean_ai(raw)


def ai_bot_id(cur):
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE is_ai LIMIT 1")
    r = cur.fetchone()
    return int(r[0]) if r else None


def ai_pick(s, ex, px, changes, held, free, open_count):
    if open_count >= s["maxPositions"]:
        return None
    lev = max(1, min(int(s["leverage"]), int(ex["maxLeverage"])))
    bet = round(min(free * s["betPercent"] / 100, s["maxBet"]), 2)
    if bet < ex["minMargin"] or bet > free + 1e-9:
        return None
    cands = []
    for c in COINS:
        if c in held or c in ex["disabledCoins"] or (s["coins"] and c not in s["coins"]):
            continue
        if not px.get(c) or c not in changes:
            continue
        ch = changes[c]
        if abs(ch) < s["minMovePct"]:
            continue
        if s["strategy"] == "long_only" and ch <= 0:
            continue
        cands.append((abs(ch), c))
    if not cands:
        return None
    cands.sort(reverse=True)
    coin = cands[0][1]
    ch = changes[coin]
    if s["strategy"] == "long_only":
        side = "long"
    elif s["strategy"] == "reversal":
        side = "short" if ch > 0 else "long"
    else:
        side = "long" if ch > 0 else "short"
    p = px[coin]
    sl_pct = min(s["stopLossPct"], 90.0 / lev) if s["stopLossPct"] > 0 else 0.0
    tp_pct = s["takeProfitPct"]
    sign = 1 if side == "long" else -1
    sl = p * (1 - sign * sl_pct / 100) if sl_pct > 0 else None
    tp = p * (1 + sign * tp_pct / 100) if tp_pct > 0 else None
    return {"coin": coin, "side": side, "leverage": lev, "margin": bet, "sl": sl, "tp": tp, "change": ch}


def fetch_changes():
    url = "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_24hr_change=true&ids=" + ",".join(COINS)
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
    key = os.environ.get("COINGECKO_API_KEY", "")
    if key:
        headers["x-cg-demo-api-key"] = key
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=2) as r:
        d = json.loads(r.read())
    return {k: float(v["usd_24h_change"]) for k, v in d.items() if v.get("usd_24h_change") is not None}


COIN_RU = {"bitcoin": "Bitcoin", "ethereum": "Ethereum", "binancecoin": "BNB", "ripple": "XRP", "solana": "Solana", "dogecoin": "Dogecoin", "hyperliquid": "Hyperliquid", "zcash": "Zcash", "tron": "TRON", "cardano": "Cardano", "chainlink": "Chainlink", "stellar": "Stellar", "avalanche-2": "Avalanche", "sui": "Sui", "shiba-inu": "Shiba Inu", "the-open-network": "Gram", "hedera-hashgraph": "Hedera", "litecoin": "Litecoin"}
REASON_RU = {"stop": "сработал стоп-лосс", "take": "сработал тейк-профит", "manual": "закрыта вручную", "liquidation": "ликвидация", "time": "вышло время удержания"}


def fmt_px(v):
    v = float(v)
    if v >= 1000:
        return f"${v:,.0f}".replace(",", " ")
    if v >= 1:
        return f"${v:,.2f}".replace(",", " ").replace(".", ",")
    return f"${v:.5f}".replace(".", ",")


def ai_post_results(cur, bot, s):
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.paper_positions WHERE user_id = {bot} AND status = 'closed' AND NOT ai_posted AND COALESCE(close_reason, '') <> 'reset'")
    pending = int(cur.fetchone()[0])
    if pending == 0:
        return 0
    cur.execute(
        f"SELECT id, coin_id, side, leverage, margin, entry_price, close_price, pnl, close_reason FROM {SCHEMA}.paper_positions "
        f"WHERE user_id = {bot} AND status = 'closed' AND NOT ai_posted AND COALESCE(close_reason, '') <> 'reset' ORDER BY closed_at, id LIMIT 50"
    )
    rows = cur.fetchall()
    big = [r for r in rows if float(r[4]) > 0 and abs(float(r[7]) / float(r[4]) * 100) >= AI_POST_MIN_PCT]
    if s["postToCommunity"] and (big or len(rows) >= s["postEvery"]):
        pick = max(big or rows, key=lambda r: abs(float(r[7])))
        pid, coin, side, lev, margin, entry, close, pnl, reason = pick
        pnl, margin = float(pnl), float(margin)
        pct = pnl / margin * 100 if margin else 0.0
        sign = "+" if pnl >= 0 else "−"
        text = (
            f"{'Закрыла в плюс' if pnl >= 0 else 'Закрыла в минус'} на тренировочной бирже: {COIN_RU.get(coin, coin)}, "
            f"{'лонг' if side == 'long' else 'шорт'} x{lev}. Вход {fmt_px(entry)} → выход {fmt_px(close)} "
            f"({REASON_RU.get(reason, 'закрыта')}). Результат: {sign}{abs(pnl):.2f} виртуальных USDT ({sign}{abs(pct):.1f}% от суммы сделки). "
            f"Это учебная игра, не инвестиционная рекомендация."
        )
        mood = ("bull" if side == "long" else "bear") if pnl >= 0 else ""
        key = f"aitrade-{pid}"
        cur.execute(
            f"INSERT INTO {SCHEMA}.community_posts (user_id, body, sentiment, coins, move_key) VALUES ({bot}, '{q(text)}', '{mood}', '{q(coin)}', '{key}') "
            f"ON CONFLICT DO NOTHING"
        )
        ids = ", ".join(str(r[0]) for r in rows)
        cur.execute(f"UPDATE {SCHEMA}.paper_positions SET ai_posted = TRUE WHERE id IN ({ids})")
        return 1
    if not s["postToCommunity"]:
        ids = ", ".join(str(r[0]) for r in rows)
        cur.execute(f"UPDATE {SCHEMA}.paper_positions SET ai_posted = TRUE WHERE id IN ({ids})")
    return 0


def ai_public(cur, px):
    bot = ai_bot_id(cur)
    s = ai_settings(cur)
    out = {"enabled": s["enabled"], "strategy": AI_STRATEGIES.get(s["strategy"], ""), "leverage": s["leverage"], "equity": None, "pnl": 0.0, "pnlPct": 0.0, "winRate": 0.0, "trades": 0, "open": [], "closed": []}
    if not bot:
        return out
    snap = ai_snapshot(cur, bot, px)
    out["equity"] = snap["equity"]
    out["pnl"] = snap["pnl"]
    out["pnlPct"] = snap["pnlPct"]
    out["open"] = [{"id": p["id"], "coinId": p["coinId"], "side": p["side"], "leverage": p["leverage"], "margin": p["margin"], "entry": p["entry"], "price": p["price"], "pnl": p["pnl"], "at": p["openedAt"]} for p in snap["positions"]]
    cur.execute(
        f"SELECT COUNT(*), COUNT(*) FILTER (WHERE pnl > 0) FROM {SCHEMA}.paper_positions WHERE user_id = {bot} AND status = 'closed' AND COALESCE(close_reason, '') <> 'reset'"
    )
    n, wins = cur.fetchone()
    out["trades"] = int(n)
    out["winRate"] = (int(wins) / int(n) * 100) if n else 0.0
    cur.execute(
        f"SELECT id, coin_id, side, leverage, margin, entry_price, close_price, pnl, close_reason, closed_at FROM {SCHEMA}.paper_positions "
        f"WHERE user_id = {bot} AND status = 'closed' AND COALESCE(close_reason, '') <> 'reset' ORDER BY closed_at DESC, id DESC LIMIT 12"
    )
    out["closed"] = [
        {"id": r[0], "coinId": r[1], "side": r[2], "leverage": r[3], "margin": float(r[4]), "entry": float(r[5]), "close": float(r[6]), "pnl": float(r[7]), "reason": r[8], "at": r[9].isoformat()}
        for r in cur.fetchall()
    ]
    return out


def ai_account(cur, bot):
    cur.execute(f"INSERT INTO {SCHEMA}.paper_accounts (user_id, balance) VALUES ({bot}, 0) ON CONFLICT (user_id) DO NOTHING")


def ai_fund(cur, bot, amount, kind, note):
    ai_account(cur, bot)
    if amount > 0:
        cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance + {amount} WHERE user_id = {bot}")
    else:
        cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance - {abs(amount)} WHERE user_id = {bot} AND balance >= {abs(amount)} RETURNING user_id")
        if not cur.fetchone():
            return False
    cur.execute(f"INSERT INTO {SCHEMA}.usdt_ledger (user_id, amount, kind, note) VALUES ({bot}, {amount}, '{kind}', '{q(note)}')")
    return True


def ai_close(cur, bot, row, px, reason):
    pid, coin, side, margin, size, entry = row
    p = px.get(coin)
    if not p:
        return False
    margin, size, entry = float(margin), float(size), float(entry)
    pnl = max(pnl_of(side, entry, size, p), -margin)
    cur.execute(f"UPDATE {SCHEMA}.paper_positions SET status = 'closed', close_price = {p}, pnl = {pnl}, close_reason = '{reason}', closed_at = NOW() WHERE id = {pid} AND status = 'open' RETURNING id")
    if not cur.fetchone():
        return False
    cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance + {margin + pnl} WHERE user_id = {bot}")
    return True


def ai_snapshot(cur, bot, px):
    cur.execute(f"SELECT balance FROM {SCHEMA}.paper_accounts WHERE user_id = {bot}")
    row = cur.fetchone()
    free = float(row[0]) if row else 0.0
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, size, entry_price, opened_at, sl, tp FROM {SCHEMA}.paper_positions WHERE user_id = {bot} AND status = 'open' ORDER BY id DESC")
    positions, locked, unreal = [], 0.0, 0.0
    for pid, coin, side, lev, margin, size, entry, at, sl, tp in cur.fetchall():
        margin, size, entry = float(margin), float(size), float(entry)
        price = px.get(coin, entry)
        pnl = pnl_of(side, entry, size, price)
        locked += margin
        unreal += pnl
        positions.append({"id": pid, "coinId": coin, "side": side, "leverage": lev, "margin": margin, "entry": entry, "price": price, "pnl": pnl, "openedAt": at.isoformat()})
    cur.execute(f"SELECT COALESCE(SUM(margin), 0) FROM {SCHEMA}.paper_orders WHERE user_id = {bot} AND status = 'pending'")
    locked += float(cur.fetchone()[0])
    equity = free + locked + unreal
    base = usdt_deposits(cur, bot)
    return {"free": free, "locked": locked, "unrealized": unreal, "equity": equity, "deposits": base,
            "pnl": equity - base if base > 0 else 0.0, "pnlPct": (equity - base) / base * 100 if base > 0 else 0.0, "positions": positions}


def ai_claim_run(cur, interval_s, force):
    now = int(time.time())
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{AI_RUN_KEY}'")
    row = cur.fetchone()
    if not row:
        cur.execute(f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('{AI_RUN_KEY}', '{now}', NOW()) ON CONFLICT (key) DO NOTHING RETURNING 1")
        return bool(cur.fetchone())
    try:
        last = int(row[0])
    except ValueError:
        last = 0
    if not force and now - last < interval_s:
        return False
    cur.execute(f"UPDATE {SCHEMA}.site_settings SET value = '{now}', updated_at = NOW() WHERE key = '{AI_RUN_KEY}' AND value = '{q(row[0])}' RETURNING 1")
    return bool(cur.fetchone())


def ai_trader_step(cur, px, started=None, force=False):
    s = ai_settings(cur)
    if not s["enabled"] or not px:
        return {"ran": False, "reason": "off"}
    if started is not None and time.time() - started > 2.5:
        return {"ran": False, "reason": "busy"}
    bot = ai_bot_id(cur)
    if not bot:
        return {"ran": False, "reason": "nobot"}
    if not ai_claim_run(cur, s["intervalMin"] * 60, force):
        return {"ran": False, "reason": "wait"}
    ai_account(cur, bot)
    process(cur, bot, px)
    closed = opened = 0
    cur.execute(
        f"SELECT id, coin_id, side, margin, size, entry_price FROM {SCHEMA}.paper_positions "
        f"WHERE user_id = {bot} AND status = 'open' AND opened_at <= NOW() - INTERVAL '{int(s['holdHours'])} hours'"
    )
    for row in cur.fetchall():
        if ai_close(cur, bot, row, px, "time"):
            closed += 1
    try:
        ai_post_results(cur, bot, s)
    except Exception as e:
        print("ai post error:", e)
    ex = exchange_settings(cur)
    if ex["enabled"]:
        snap = ai_snapshot(cur, bot, px)
        held = {p["coinId"] for p in snap["positions"]}
        if len(held) < s["maxPositions"] and snap["free"] >= ex["minMargin"]:
            try:
                changes = fetch_changes()
            except Exception as e:
                print("ai changes error:", e)
                changes = {}
            plan = ai_pick(s, ex, px, changes, held, snap["free"], len(snap["positions"]))
            if plan:
                fee = trade_fee(ex, plan["margin"], plan["leverage"])
                total = round(plan["margin"] + fee, 4)
                cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance - {total} WHERE user_id = {bot} AND balance >= {total} RETURNING user_id")
                if cur.fetchone():
                    if fee > 0:
                        cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({bot}, {fee}, 'fee', 'Комиссия сделки')")
                    p = px[plan["coin"]]
                    size = plan["margin"] * plan["leverage"] / p
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.paper_positions (user_id, coin_id, side, leverage, margin, size, entry_price, sl, tp) "
                        f"VALUES ({bot}, '{plan['coin']}', '{plan['side']}', {plan['leverage']}, {plan['margin']}, {size}, {p}, {sql_num(plan['sl'])}, {sql_num(plan['tp'])})"
                    )
                    opened = 1
    return {"ran": True, "opened": opened, "closed": closed}


def ai_admin_payload(cur, px):
    bot = ai_bot_id(cur)
    out = {"settings": ai_settings(cur), "botId": bot, "name": "AiTKA", "strategies": AI_STRATEGIES, "account": None, "trades": [], "lastRun": None}
    if not bot:
        return out
    out["account"] = ai_snapshot(cur, bot, px)
    cur.execute(f"SELECT id, coin_id, side, leverage, margin, entry_price, close_price, pnl, close_reason, closed_at FROM {SCHEMA}.paper_positions WHERE user_id = {bot} AND status = 'closed' ORDER BY closed_at DESC LIMIT 15")
    out["trades"] = [{"id": r[0], "coinId": r[1], "side": r[2], "leverage": r[3], "margin": float(r[4]), "entry": float(r[5]), "close": float(r[6]), "pnl": float(r[7]), "reason": r[8], "closedAt": r[9].isoformat()} for r in cur.fetchall()]
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{AI_RUN_KEY}'")
    row = cur.fetchone()
    try:
        out["lastRun"] = int(row[0]) if row else None
    except ValueError:
        out["lastRun"] = None
    return out



SHOP_KINDS = {"header": "Шапки постов", "frame": "Рамки аватара", "card": "Шапки мини-карточки", "theme": "Темы сообщений", "badge": "Значки", "gift": "Подарки"}
SHOP_EQUIP = {"header", "frame", "card", "theme", "badge"}
SHOP_KEY = "shop_settings"
SHOP_DEFAULT = {"enabled": True, "message": "", "giftDailyLimit": 5, "giftFeePercent": 0.0, "discountPercent": 0.0}
SHOP_ITEM_COLS = "id, slug, kind, name, description, emoji, price, stock, sold, enabled, sort"


def shop_settings(cur):
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{SHOP_KEY}'")
    row = cur.fetchone()
    raw = {}
    if row and row[0]:
        try:
            raw = json.loads(row[0])
        except ValueError:
            raw = {}
    out = dict(SHOP_DEFAULT)
    try:
        out["enabled"] = bool(raw.get("enabled", True))
        out["message"] = str(raw.get("message") or "")[:200]
        out["giftDailyLimit"] = max(0, min(int(raw.get("giftDailyLimit", 5)), 100))
        out["giftFeePercent"] = max(0.0, min(float(raw.get("giftFeePercent", 0)), 50.0))
        out["discountPercent"] = max(0.0, min(float(raw.get("discountPercent", 0)), 90.0))
    except (TypeError, ValueError):
        pass
    return out


def shop_price(base, st):
    return round(float(base) * (1 - st["discountPercent"] / 100), 2)


def shop_item(r, st=None):
    d = {"id": r[0], "slug": r[1], "kind": r[2], "name": r[3], "description": r[4], "emoji": r[5], "basePrice": float(r[6]),
         "stock": r[7], "sold": int(r[8]), "enabled": bool(r[9]), "sort": int(r[10])}
    d["price"] = shop_price(r[6], st) if st else d["basePrice"]
    return d


def shop_catalog(cur, uid, admin=False):
    st = shop_settings(cur)
    cond = "" if admin else "WHERE enabled"
    cur.execute(f"SELECT {SHOP_ITEM_COLS} FROM {SCHEMA}.shop_items {cond} ORDER BY sort, id")
    items = [shop_item(r, st) for r in cur.fetchall()]
    owned, equipped = set(), {}
    balance = 0.0
    if uid:
        cur.execute(f"SELECT item_id FROM {SCHEMA}.shop_purchases WHERE user_id = {int(uid)}")
        owned = {int(r[0]) for r in cur.fetchall()}
        cur.execute(f"SELECT kind, item_id FROM {SCHEMA}.shop_equipped WHERE user_id = {int(uid)}")
        equipped = {r[0]: int(r[1]) for r in cur.fetchall()}
        balance = tka_balance(cur, uid)
    for it in items:
        it["owned"] = it["id"] in owned and it["kind"] != "gift"
        it["equipped"] = equipped.get(it["kind"]) == it["id"]
        it["soldOut"] = it["stock"] is not None and it["sold"] >= it["stock"]
    return {"items": items, "kinds": SHOP_KINDS, "settings": st, "balance": balance}


def shop_cosmetics(cur):
    now = time.time()
    if _cosm["data"] is not None and now - _cosm["at"] < 60:
        return _cosm["data"]
    cur.execute(
        f"SELECT e.user_id, e.kind, i.slug, i.emoji, i.name FROM {SCHEMA}.shop_equipped e JOIN {SCHEMA}.shop_items i ON i.id = e.item_id "
        f"WHERE i.enabled ORDER BY e.user_id LIMIT 5000"
    )
    out = {}
    for uid_, kind, slug, emoji, name in cur.fetchall():
        out.setdefault(str(uid_), {})[kind] = {"slug": slug, "emoji": emoji, "name": name}
    _cosm.update(at=now, data=out)
    return out


def shop_spend(cur, uid, amount, kind, note):
    cur.execute(
        f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) "
        f"SELECT {int(uid)}, -{amount}, '{kind}', '{q(note)[:120]}' "
        f"WHERE (SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.tka_ledger WHERE user_id = {int(uid)}) >= {amount} RETURNING id"
    )
    return bool(cur.fetchone())


def shop_take_stock(cur, item_id):
    cur.execute(
        f"UPDATE {SCHEMA}.shop_items SET sold = sold + 1 WHERE id = {int(item_id)} AND enabled AND (stock IS NULL OR sold < stock) RETURNING id"
    )
    return bool(cur.fetchone())


def shop_do(cur, uid, act, body):
    st = shop_settings(cur)
    try:
        item_id = int(body.get("itemId"))
    except (TypeError, ValueError):
        return 400, {"error": "Товар не найден"}
    cur.execute(f"SELECT {SHOP_ITEM_COLS} FROM {SCHEMA}.shop_items WHERE id = {item_id}")
    row = cur.fetchone()
    if not row:
        return 404, {"error": "Товар не найден"}
    item = shop_item(row, st)

    if act == "shop_equip":
        if item["kind"] not in SHOP_EQUIP:
            return 400, {"error": "Этот товар нельзя надеть"}
        if body.get("off"):
            cur.execute(f"UPDATE {SCHEMA}.shop_equipped SET item_id = 0 WHERE user_id = {uid} AND kind = '{item['kind']}'")
            return 200, {"ok": True}
        cur.execute(f"SELECT 1 FROM {SCHEMA}.shop_purchases WHERE user_id = {uid} AND item_id = {item_id}")
        if not cur.fetchone():
            return 403, {"error": "Сначала купите этот товар"}
        cur.execute(
            f"INSERT INTO {SCHEMA}.shop_equipped (user_id, kind, item_id) VALUES ({uid}, '{item['kind']}', {item_id}) "
            f"ON CONFLICT (user_id, kind) DO UPDATE SET item_id = EXCLUDED.item_id"
        )
        return 200, {"ok": True}

    if not st["enabled"]:
        return 403, {"error": st["message"] or "Магазин временно закрыт"}
    if not item["enabled"]:
        return 400, {"error": "Этот товар сейчас недоступен"}
    price = item["price"]

    if act == "shop_buy":
        if item["kind"] == "gift":
            return 400, {"error": "Подарок можно только подарить участнику"}
        cur.execute(f"SELECT 1 FROM {SCHEMA}.shop_purchases WHERE user_id = {uid} AND item_id = {item_id}")
        if cur.fetchone():
            return 400, {"error": "Этот товар у вас уже есть"}
        if not shop_take_stock(cur, item_id):
            return 400, {"error": "Товар закончился"}
        if price > 0 and not shop_spend(cur, uid, price, "shop", f"Магазин: {item['name']}"):
            cur.execute(f"UPDATE {SCHEMA}.shop_items SET sold = sold - 1 WHERE id = {item_id}")
            return 400, {"error": "Недостаточно TKA на кошельке"}
        cur.execute(f"INSERT INTO {SCHEMA}.shop_purchases (user_id, item_id, price, source) VALUES ({uid}, {item_id}, {price}, 'buy')")
        if item["kind"] in SHOP_EQUIP:
            cur.execute(
                f"INSERT INTO {SCHEMA}.shop_equipped (user_id, kind, item_id) VALUES ({uid}, '{item['kind']}', {item_id}) "
                f"ON CONFLICT (user_id, kind) DO UPDATE SET item_id = EXCLUDED.item_id"
            )
        return 200, {"ok": True, "spent": price}

    if act == "shop_gift":
        try:
            to = int(body.get("toUser"))
        except (TypeError, ValueError):
            return 400, {"error": "Выберите получателя"}
        if to == uid:
            return 400, {"error": "Себе дарить нельзя"}
        cur.execute(f"SELECT COALESCE(NULLIF(name, ''), split_part(email, '@', 1)), is_bot FROM {SCHEMA}.users WHERE id = {to}")
        rcp = cur.fetchone()
        if not rcp or rcp[1]:
            return 404, {"error": "Получатель не найден"}
        if st["giftDailyLimit"] <= 0:
            return 403, {"error": "Подарки сейчас отключены"}
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.shop_gifts WHERE from_user = {uid} AND created_at > NOW() - INTERVAL '1 day'")
        if int(cur.fetchone()[0]) >= st["giftDailyLimit"]:
            return 400, {"error": f"Можно дарить не больше {st['giftDailyLimit']} раз в сутки"}
        if item["kind"] != "gift":
            cur.execute(f"SELECT 1 FROM {SCHEMA}.shop_purchases WHERE user_id = {to} AND item_id = {item_id}")
            if cur.fetchone():
                return 400, {"error": "У получателя уже есть этот товар"}
        if not shop_take_stock(cur, item_id):
            return 400, {"error": "Товар закончился"}
        total = round(price * (1 + st["giftFeePercent"] / 100), 2)
        msg = str(body.get("message") or "").strip()[:140]
        if total > 0 and not shop_spend(cur, uid, total, "shop", f"Подарок для {rcp[0]}: {item['name']}"):
            cur.execute(f"UPDATE {SCHEMA}.shop_items SET sold = sold - 1 WHERE id = {item_id}")
            return 400, {"error": "Недостаточно TKA на кошельке"}
        cur.execute(f"INSERT INTO {SCHEMA}.shop_gifts (from_user, to_user, item_id, price, message) VALUES ({uid}, {to}, {item_id}, {total}, '{q(msg)}')")
        if item["kind"] != "gift":
            cur.execute(f"INSERT INTO {SCHEMA}.shop_purchases (user_id, item_id, price, source) VALUES ({to}, {item_id}, 0, 'gift') ON CONFLICT DO NOTHING")
        return 200, {"ok": True, "spent": total, "to": rcp[0]}
    return 400, {"error": "Неизвестное действие"}


def shop_gifts_for(cur, uid):
    cur.execute(
        f"SELECT g.id, g.message, g.created_at, i.name, i.emoji, i.kind, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) "
        f"FROM {SCHEMA}.shop_gifts g JOIN {SCHEMA}.shop_items i ON i.id = g.item_id JOIN {SCHEMA}.users u ON u.id = g.from_user "
        f"WHERE g.to_user = {int(uid)} ORDER BY g.id DESC LIMIT 30"
    )
    return [{"id": r[0], "message": r[1], "at": r[2].isoformat(), "name": r[3], "emoji": r[4], "kind": r[5], "from": r[6]} for r in cur.fetchall()]


def shop_admin(cur):
    st = shop_settings(cur)
    cur.execute(f"SELECT COUNT(*) FILTER (WHERE source = 'buy'), COALESCE(SUM(price) FILTER (WHERE source = 'buy'), 0), COUNT(*) FILTER (WHERE source = 'gift') FROM {SCHEMA}.shop_purchases")
    buys, revenue, gifted = cur.fetchone()
    cur.execute(f"SELECT COUNT(*), COALESCE(SUM(price), 0) FROM {SCHEMA}.shop_gifts")
    gcnt, gsum = cur.fetchone()
    cur.execute(
        f"SELECT i.name, COUNT(p.id) AS n FROM {SCHEMA}.shop_items i JOIN {SCHEMA}.shop_purchases p ON p.item_id = i.id WHERE p.source = 'buy' "
        f"GROUP BY i.id, i.name ORDER BY n DESC LIMIT 5"
    )
    top = [{"name": r[0], "count": int(r[1])} for r in cur.fetchall()]
    cur.execute(
        f"SELECT p.id, p.price, p.source, p.created_at, i.name, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) "
        f"FROM {SCHEMA}.shop_purchases p JOIN {SCHEMA}.shop_items i ON i.id = p.item_id JOIN {SCHEMA}.users u ON u.id = p.user_id "
        f"ORDER BY p.id DESC LIMIT 15"
    )
    recent = [{"id": r[0], "price": float(r[1]), "source": r[2], "at": r[3].isoformat(), "item": r[4], "user": r[5]} for r in cur.fetchall()]
    return {"settings": st, "stats": {"buys": int(buys), "revenue": float(revenue), "gifts": int(gcnt), "giftsSum": float(gsum), "granted": int(gifted)}, "top": top, "recent": recent, "kinds": SHOP_KINDS}


def handler(event, context):
    """Тренировочная биржа: виртуальный счёт, рыночные и лимитные ордера, плечо, шорт, рейтинг"""
    t0 = time.time()
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
        if action == "tick":
            px = prices()
            secret = os.environ.get("TRADING_CRON_SECRET", "")
            if not secret or qs.get("key", "") != secret:
                return resp(403, {"error": "Доступ запрещён"})
            if not px:
                return resp(503, {"error": "Курсы недоступны"})
            finish_due(cur)
            checked = tick(cur, px)
            return resp(200, {"checked": checked, "ai": ai_trader_step(cur, px, force=True)})
        if method == "GET" and action == "shop_catalog":
            return resp(200, shop_catalog(cur, opt_uid(cur, token)))
        if method == "GET" and action == "shop_cosmetics":
            return resp(200, {"users": shop_cosmetics(cur)})
        if method == "GET" and action == "exchange_settings":
            return resp(200, exchange_settings(cur))
        if method == "GET" and action == "top_feed":
            now = time.time()
            if _feed["data"] is not None and now - _feed["at"] < 60:
                return resp(200, _feed["data"])
            data = top_trades_feed(cur)
            _feed.update(at=now, data=data)
            return resp(200, data)
        if method == "GET" and action == "top_traders":
            now = time.time()
            if _top["data"] is not None and now - _top["at"] < 120:
                return resp(200, {"top": _top["data"]})
            rows = [r for r in leaderboard(cur, prices()) if r["pnl"] > 0][:3]
            ids = [int(r["userId"]) for r in rows]
            _top.update(at=now, data=ids)
            return resp(200, {"top": ids})
        if method == "GET" and action == "fund":
            return resp(200, fund_state(cur, opt_uid(cur, token)))
        if method == "GET" and action == "fund_donors":
            cur.execute(
                f"SELECT user_id, SUM(amount) FROM {SCHEMA}.fund_ledger WHERE kind IN ('fee', 'donation') AND user_id > 0 "
                f"GROUP BY user_id HAVING SUM(amount) > 0 ORDER BY SUM(amount) DESC LIMIT 2000"
            )
            return resp(200, {"donors": {str(r[0]): round(float(r[1]), 2) for r in cur.fetchall()}})
        if method == "GET" and action == "contests":
            return resp(200, {"contests": contests_list(cur, opt_uid(cur, token)), "available": max(fund_total(cur), 0)})
        if not token:
            return resp(401, {"error": "Биржа доступна только зарегистрированным пользователям. Войдите или зарегистрируйтесь"})
        cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = '{token}' AND expires_at > NOW()")
        row = cur.fetchone()
        if not row:
            return resp(401, {"error": "Сессия истекла, войдите заново"})
        uid = int(row[0])
        if method == "GET" and action == "candles":
            res = candles(qs.get("coinId", ""), qs.get("interval", "1h"))
            if not res:
                return resp(503, {"error": "Свечи сейчас недоступны"})
            return resp(200, {"source": res["source"], "candles": res["candles"]})
        px = prices()
        if method == "GET" and action == "trades":
            uid_q = str(qs.get("userId", ""))
            if not uid_q.isdigit():
                return resp(400, {"error": "Не указан участник"})
            return resp(200, {"trades": public_trades(cur, int(uid_q), px)})
        if method == "GET" and action == "profile":
            uid_q = str(qs.get("userId", ""))
            if not uid_q.isdigit():
                return resp(400, {"error": "Не указан участник"})
            return resp(200, {"stats": public_stats(cur, int(uid_q), px)})
        if method == "GET" and action == "leaderboard":
            try:
                ai_trader_step(cur, px, started=t0)
            except Exception as e:
                print("ai trader error:", e)
            return resp(200, {"leaders": leaderboard(cur, px)})
        if method == "GET" and action == "daily":
            ensure_account(cur, uid)
            return resp(200, daily_state(cur, uid))
        if method == "GET" and action == "shop_gifts":
            return resp(200, {"gifts": shop_gifts_for(cur, uid)})
        if method == "GET" and action == "shop_admin":
            if not is_admin(cur, uid):
                return resp(403, {"error": "Доступ только для администратора"})
            out = shop_admin(cur)
            out.update(shop_catalog(cur, uid, admin=True))
            out["settings"] = shop_settings(cur)
            return resp(200, out)
        if method == "GET" and action == "ai_public":
            try:
                ai_trader_step(cur, px, started=t0)
            except Exception as e:
                print("ai trader error:", e)
            return resp(200, ai_public(cur, px))
        if method == "GET" and action == "ai_admin":
            if not is_admin(cur, uid):
                return resp(403, {"error": "Доступ только для администратора"})
            return resp(200, ai_admin_payload(cur, px))
        if method == "GET" and action == "exchange_admin":
            if not is_admin(cur, uid):
                return resp(403, {"error": "Доступ только для администратора"})
            cur.execute(f"SELECT COUNT(*) FILTER (WHERE status = 'open'), COUNT(*) FILTER (WHERE status = 'closed'), COUNT(DISTINCT user_id) FROM {SCHEMA}.paper_positions")
            op, cl, tr = cur.fetchone()
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.paper_orders WHERE status = 'pending'")
            po = cur.fetchone()[0]
            cur.execute(f"SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM {SCHEMA}.fund_ledger WHERE kind = 'fee' AND note LIKE 'Комиссия сделки%'")
            fees, fcnt = cur.fetchone()
            return resp(200, {"settings": exchange_settings(cur), "stats": {"open": int(op), "closed": int(cl), "traders": int(tr), "orders": int(po), "fees": float(fees), "feeOps": int(fcnt)}})
        if method == "GET" and action == "fund_admin":
            if not is_admin(cur, uid):
                return resp(403, {"error": "Доступ только для администратора"})
            cur.execute(
                f"SELECT f.id, f.amount, f.kind, f.note, f.created_at, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) "
                f"FROM {SCHEMA}.fund_ledger f LEFT JOIN {SCHEMA}.users u ON u.id = f.user_id ORDER BY f.id DESC LIMIT 40"
            )
            ops = [{"id": r[0], "amount": float(r[1]), "kind": r[2], "note": r[3], "at": r[4].isoformat(), "user": r[5] or ""} for r in cur.fetchall()]
            return resp(200, {"state": fund_state(cur, uid), "settings": fund_settings(cur), "ops": ops})
        if method == "GET" and action == "wallet":
            finish_due(cur)
            ensure_account(cur, uid)
            cur.execute(f"SELECT balance FROM {SCHEMA}.paper_accounts WHERE user_id = {uid}")
            free = float(cur.fetchone()[0])
            cur.execute(f"SELECT COALESCE(SUM(margin), 0) FROM {SCHEMA}.paper_positions WHERE user_id = {uid} AND status = 'open'")
            in_pos = float(cur.fetchone()[0])
            cur.execute(f"SELECT COALESCE(SUM(margin), 0) FROM {SCHEMA}.paper_orders WHERE user_id = {uid} AND status = 'pending'")
            in_ord = float(cur.fetchone()[0])
            cur.execute(f"SELECT amount, kind, note, created_at FROM {SCHEMA}.tka_ledger WHERE user_id = {uid} ORDER BY id DESC LIMIT 20")
            led = [{"amount": float(r[0]), "kind": r[1], "note": r[2], "at": r[3].isoformat()} for r in cur.fetchall()]
            tka = tka_balance(cur, uid)
            return resp(200, {"free": tka, "locked": 0, "total": tka, "ledger": led, "usdt": {"free": free, "locked": in_pos + in_ord, "total": free + in_pos + in_ord}})
        if method == "GET":
            return resp(200, state(cur, uid, px))
        body = json.loads(event.get("body") or "{}")
        act = body.get("action")
        if act in ("shop_buy", "shop_equip", "shop_gift"):
            ensure_account(cur, uid)
            code, out = shop_do(cur, uid, act, body)
            if code != 200:
                return resp(code, out)
            _cosm["data"] = None
            cat = shop_catalog(cur, uid)
            cat["result"] = out
            return resp(200, cat)
        if act in ("shop_save", "shop_item_save", "shop_item_add", "shop_grant"):
            if not is_admin(cur, uid):
                return resp(403, {"error": "Доступ только для администратора"})
            if act == "shop_save":
                try:
                    new = {
                        "enabled": bool(body.get("enabled")),
                        "message": str(body.get("message") or "").strip()[:200],
                        "giftDailyLimit": max(0, min(int(body.get("giftDailyLimit")), 100)),
                        "giftFeePercent": max(0.0, min(float(body.get("giftFeePercent")), 50.0)),
                        "discountPercent": max(0.0, min(float(body.get("discountPercent")), 90.0)),
                    }
                except (TypeError, ValueError):
                    return resp(400, {"error": "Проверьте числа в настройках"})
                val = qj(json.dumps(new, ensure_ascii=False))
                cur.execute(
                    f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('{SHOP_KEY}', '{val}', NOW()) "
                    f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
                )
            elif act == "shop_item_save":
                try:
                    iid = int(body.get("id"))
                    price = max(0.0, min(round(float(body.get("price")), 2), 1000000.0))
                    stock = body.get("stock")
                    stock = "NULL" if stock in (None, "", 0, "0") else str(max(1, min(int(stock), 1000000)))
                    sort = max(0, min(int(body.get("sort", 0)), 10000))
                except (TypeError, ValueError):
                    return resp(400, {"error": "Проверьте цену и количество"})
                name = q(str(body.get("name") or "").strip()[:60])
                desc = q(str(body.get("description") or "").strip()[:200])
                if len(name) < 2:
                    return resp(400, {"error": "Введите название товара"})
                cur.execute(
                    f"UPDATE {SCHEMA}.shop_items SET name = '{name}', description = '{desc}', price = {price}, stock = {stock}, sort = {sort}, "
                    f"enabled = {'TRUE' if body.get('enabled') else 'FALSE'} WHERE id = {iid} RETURNING id"
                )
                if not cur.fetchone():
                    return resp(404, {"error": "Товар не найден"})
            elif act == "shop_item_add":
                kind = body.get("kind")
                if kind not in SHOP_KINDS or kind not in ("badge", "gift"):
                    return resp(400, {"error": "Новые товары можно добавлять в «Значки» и «Подарки»"})
                name = q(str(body.get("name") or "").strip()[:60])
                emoji = str(body.get("emoji") or "").strip()[:8]
                if len(name) < 2 or not emoji:
                    return resp(400, {"error": "Нужны название и эмодзи"})
                try:
                    price = max(0.0, min(round(float(body.get("price")), 2), 1000000.0))
                except (TypeError, ValueError):
                    return resp(400, {"error": "Укажите цену"})
                desc = q(str(body.get("description") or "").strip()[:200])
                cur.execute(f"SELECT COALESCE(MAX(sort), 0) + 10 FROM {SCHEMA}.shop_items WHERE kind = '{kind}'")
                nxt = cur.fetchone()[0]
                slug = f"x_{kind[0]}_{int(time.time())}"
                cur.execute(
                    f"INSERT INTO {SCHEMA}.shop_items (slug, kind, name, description, emoji, price, sort) "
                    f"VALUES ('{slug}', '{kind}', '{name}', '{desc}', '{q(emoji)}', {price}, {int(nxt)})"
                )
            else:
                try:
                    target = int(body.get("userId"))
                    iid = int(body.get("itemId"))
                except (TypeError, ValueError):
                    return resp(400, {"error": "Укажите участника и товар"})
                cur.execute(f"SELECT kind FROM {SCHEMA}.shop_items WHERE id = {iid}")
                r = cur.fetchone()
                if not r or r[0] == "gift":
                    return resp(400, {"error": "Подарок-открытку выдать нельзя, выберите значок, рамку, шапку или тему"})
                cur.execute(f"SELECT 1 FROM {SCHEMA}.users WHERE id = {target}")
                if not cur.fetchone():
                    return resp(404, {"error": "Участник не найден"})
                cur.execute(f"INSERT INTO {SCHEMA}.shop_purchases (user_id, item_id, price, source) VALUES ({target}, {iid}, 0, 'gift') ON CONFLICT DO NOTHING")
            _cosm["data"] = None
            out = shop_admin(cur)
            out.update(shop_catalog(cur, uid, admin=True))
            out["settings"] = shop_settings(cur)
            return resp(200, out)
        if act in ("ai_save", "ai_fund", "ai_run", "ai_close_all", "ai_reset"):
            if not is_admin(cur, uid):
                return resp(403, {"error": "Доступ только для администратора"})
            bot = ai_bot_id(cur)
            if not bot:
                return resp(404, {"error": "Бот AiTKA не найден"})
            if act == "ai_save":
                new = clean_ai(body)
                val = qj(json.dumps(new, ensure_ascii=False))
                cur.execute(
                    f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('{AI_KEY}', '{val}', NOW()) "
                    f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
                )
            elif act == "ai_fund":
                try:
                    amount = round(float(body.get("amount", 0)), 2)
                except (TypeError, ValueError):
                    return resp(400, {"error": "Укажите сумму"})
                if amount == 0 or abs(amount) > 1000000:
                    return resp(400, {"error": "Сумма от 1 до 1 000 000, плюс — пополнить, минус — забрать"})
                if not ai_fund(cur, bot, amount, "ai_admin", "Пополнение админом" if amount > 0 else "Списание админом"):
                    return resp(400, {"error": "У AiTKA нет столько свободных USDT"})
            elif act == "ai_run":
                ai_trader_step(cur, px, force=True)
            elif act == "ai_close_all":
                cur.execute(f"SELECT id, coin_id, side, margin, size, entry_price FROM {SCHEMA}.paper_positions WHERE user_id = {bot} AND status = 'open'")
                for row in cur.fetchall():
                    ai_close(cur, bot, row, px, "manual")
            elif act == "ai_reset":
                cur.execute(f"SELECT id, coin_id, side, margin, size, entry_price FROM {SCHEMA}.paper_positions WHERE user_id = {bot} AND status = 'open'")
                for row in cur.fetchall():
                    ai_close(cur, bot, row, px, "manual")
                cur.execute(f"UPDATE {SCHEMA}.paper_orders SET status = 'cancelled', done_at = NOW() WHERE user_id = {bot} AND status = 'pending'")
                cur.execute(f"SELECT balance FROM {SCHEMA}.paper_accounts WHERE user_id = {bot}")
                row = cur.fetchone()
                have = float(row[0]) if row else 0.0
                target = ai_settings(cur)["startBalance"]
                if target != have:
                    ai_fund(cur, bot, round(target - have, 2), "ai_admin", "Сброс счёта AiTKA")
                cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET resets = resets + 1, reset_at = NOW() WHERE user_id = {bot}")
            return resp(200, ai_admin_payload(cur, px))
        if act == "exchange_save":
            if not is_admin(cur, uid):
                return resp(403, {"error": "Доступ только для администратора"})
            try:
                new = {
                    "enabled": bool(body.get("enabled")),
                    "message": str(body.get("message") or "").strip()[:200],
                    "maxLeverage": max(1, min(int(body.get("maxLeverage")), MAX_LEV)),
                    "minMargin": max(0.01, min(float(body.get("minMargin")), 1000000.0)),
                    "feePercent": max(0.0, min(float(body.get("feePercent")), 1.0)),
                    "feeBase": "margin" if body.get("feeBase") == "margin" else "volume",
                    "disabledCoins": [c for c in (body.get("disabledCoins") or []) if c in COINS],
                }
            except (TypeError, ValueError):
                return resp(400, {"error": "Проверьте плечо, минимальную ставку и комиссию"})
            val = qj(json.dumps(new, ensure_ascii=False))
            cur.execute(
                f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('{EX_KEY}', '{val}', NOW()) "
                f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
            )
            return resp(200, exchange_settings(cur))
        if act == "contest_join":
            try:
                cid = int(body.get("id"))
            except (TypeError, ValueError):
                return resp(400, {"error": "Конкурс не найден"})
            finish_due(cur)
            cur.execute(f"SELECT 1 FROM {SCHEMA}.contests WHERE id = {cid} AND status = 'active' AND ends_at > NOW()")
            if not cur.fetchone():
                return resp(400, {"error": "Конкурс уже закончился"})
            cur.execute(f"INSERT INTO {SCHEMA}.contest_entries (contest_id, user_id) VALUES ({cid}, {uid}) ON CONFLICT DO NOTHING RETURNING user_id")
            if not cur.fetchone():
                return resp(400, {"error": "Вы уже участвуете в этом конкурсе"})
            return resp(200, {"contests": contests_list(cur, uid)})
        if act in ("contest_create", "contest_cancel", "contest_finish"):
            if not is_admin(cur, uid):
                return resp(403, {"error": "Доступ только для администратора"})
            if act == "contest_create":
                title = str(body.get("title") or "").strip()[:120]
                if len(title) < 3:
                    return resp(400, {"error": "Введите название конкурса"})
                kind = body.get("kind")
                if kind not in CONTEST_KINDS:
                    return resp(400, {"error": "Выберите тип конкурса"})
                try:
                    prize = round(float(body.get("prize")), 2)
                except (TypeError, ValueError):
                    return resp(400, {"error": "Укажите приз"})
                if prize < 1:
                    return resp(400, {"error": "Приз не меньше 1 TKA"})
                ends = str(body.get("endsAt") or "")
                if not ISO_RE.match(ends):
                    return resp(400, {"error": "Укажите дату окончания"})
                cur.execute(f"SELECT '{ends}'::timestamptz > NOW() + INTERVAL '5 minutes', '{ends}'::timestamptz < NOW() + INTERVAL '90 days'")
                ok_future, ok_far = cur.fetchone()
                if not ok_future:
                    return resp(400, {"error": "Окончание должно быть не раньше чем через 5 минут"})
                if not ok_far:
                    return resp(400, {"error": "Конкурс не может идти дольше 90 дней"})
                if fund_total(cur) < prize:
                    return resp(400, {"error": "В фонде недостаточно средств для такого приза"})
                desc = q(str(body.get("description") or "").strip()[:600])
                cur.execute(
                    f"INSERT INTO {SCHEMA}.contests (title, description, kind, prize, ends_at, created_by) "
                    f"VALUES ('{q(title)}', '{desc}', '{kind}', {prize}, '{ends}'::timestamptz, {uid}) RETURNING id"
                )
                cid = cur.fetchone()[0]
                note = q(f"Приз конкурса «{title}» зарезервирован")[:120]
                cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({uid}, -{prize}, 'contest', '{note}')")
            else:
                try:
                    cid = int(body.get("id"))
                except (TypeError, ValueError):
                    return resp(400, {"error": "Конкурс не найден"})
                if act == "contest_finish":
                    if finish_contest(cur, cid, True) is None:
                        return resp(404, {"error": "Конкурс не найден или уже завершён"})
                else:
                    cur.execute(f"UPDATE {SCHEMA}.contests SET status = 'cancelled', finished_at = NOW() WHERE id = {cid} AND status = 'active' RETURNING title, prize")
                    r = cur.fetchone()
                    if not r:
                        return resp(404, {"error": "Конкурс не найден или уже завершён"})
                    note = q(f"Возврат приза: конкурс «{r[0]}» отменён")[:120]
                    cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({uid}, {float(r[1])}, 'deposit', '{note}')")
            return resp(200, {"contests": contests_list(cur, uid), "available": max(fund_total(cur), 0)})
        if act in ("fund_settings", "fund_adjust", "fund_payout"):
            if not is_admin(cur, uid):
                return resp(403, {"error": "Доступ только для администратора"})
            if act == "fund_settings":
                try:
                    goal = max(0.0, min(float(body.get("goal") or 0), 1e9))
                    pct = max(0.0, min(float(body.get("feePercent")), 5.0))
                except (TypeError, ValueError):
                    return resp(400, {"error": "Проверьте цель и процент комиссии"})
                new = {
                    "title": str(body.get("title") or FUND_DEFAULT["title"]).strip()[:80],
                    "description": str(body.get("description") or "").strip()[:600],
                    "goal": goal,
                    "feePercent": pct,
                }
                val = qj(json.dumps(new, ensure_ascii=False))
                cur.execute(
                    f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('{FUND_KEY}', '{val}', NOW()) "
                    f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
                )
                return resp(200, {"state": fund_state(cur, uid), "settings": fund_settings(cur)})
            try:
                amount = round(float(body.get("amount", 0)), 2)
            except (TypeError, ValueError):
                return resp(400, {"error": "Укажите сумму"})
            note = q(str(body.get("note") or "").strip()[:80])
            if act == "fund_adjust":
                if amount == 0:
                    return resp(400, {"error": "Сумма не может быть нулевой"})
                if amount < 0 and fund_total(cur) + amount < 0:
                    return resp(400, {"error": "В фонде недостаточно средств"})
                kind = "deposit" if amount > 0 else "adjust"
                label = q(("Пополнение админом" if amount > 0 else "Списание админом") + (f": {note}" if note else ""))[:120]
                cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({uid}, {amount}, '{kind}', '{label}')")
            else:
                try:
                    target = int(body.get("userId"))
                except (TypeError, ValueError):
                    return resp(400, {"error": "Укажите номер участника"})
                if amount <= 0:
                    return resp(400, {"error": "Сумма выплаты должна быть больше нуля"})
                if fund_total(cur) < amount:
                    return resp(400, {"error": "В фонде недостаточно средств"})
                cur.execute(f"SELECT 1 FROM {SCHEMA}.users WHERE id = {target}")
                if not cur.fetchone():
                    return resp(404, {"error": "Участник не найден"})
                label = q("Выплата из фонда" + (f": {note}" if note else ""))[:120]
                cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({target}, -{amount}, 'payout', '{label}')")
                cur.execute(f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({target}, {amount}, 'gift', '{label}')")
            return resp(200, {"state": fund_state(cur, uid), "settings": fund_settings(cur)})
        ensure_account(cur, uid)
        process(cur, uid, px)
        if act == "daily":
            ds = daily_state(cur, uid)
            if ds["claimed"]:
                return resp(400, {"error": "Сегодняшний бонус уже получен, заходите завтра"})
            day = ds["nextDay"]
            reward = ds["reward"]
            cur.execute(
                f"INSERT INTO {SCHEMA}.tka_daily (user_id, last_day, streak) VALUES ({uid}, {TODAY}, {day}) "
                f"ON CONFLICT (user_id) DO UPDATE SET last_day = {TODAY}, streak = {day} WHERE {SCHEMA}.tka_daily.last_day < {TODAY} RETURNING user_id"
            )
            if not cur.fetchone():
                return resp(400, {"error": "Сегодняшний бонус уже получен, заходите завтра"})
            cur.execute(f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({uid}, {reward}, 'daily', 'Ежедневный бонус, день {day}')")
            out = daily_state(cur, uid)
            out["got"] = reward
            return resp(200, out)
        if act in ("exchange", "withdraw"):
            try:
                amount = round(float(body.get("amount", 0)), 2)
            except (TypeError, ValueError):
                return resp(400, {"error": "Укажите сумму обмена"})
            if amount < MIN_EXCHANGE:
                return resp(400, {"error": f"Минимальная сумма обмена {int(MIN_EXCHANGE)}"})
            fee = round(amount * fee_rate(cur), 4)
            net = round(amount - fee, 4)
            if act == "exchange":
                cur.execute(
                    f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) "
                    f"SELECT {uid}, -{amount}, 'exchange', 'Обмен на виртуальные USDT' "
                    f"WHERE (SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.tka_ledger WHERE user_id = {uid}) >= {amount} RETURNING id"
                )
                if not cur.fetchone():
                    return resp(400, {"error": "Недостаточно TKA на кошельке"})
                cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance + {net} WHERE user_id = {uid}")
                cur.execute(f"INSERT INTO {SCHEMA}.usdt_ledger (user_id, amount, kind, note) VALUES ({uid}, {net}, 'exchange', 'Обмен TKA на виртуальные USDT')")
                cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({uid}, {fee}, 'fee', 'Комиссия обмена TKA в USDT')")
            else:
                cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance - {amount} WHERE user_id = {uid} AND balance >= {amount} RETURNING user_id")
                if not cur.fetchone():
                    return resp(400, {"error": "Недостаточно свободных USDT. Деньги в сделках и ордерах обменять нельзя"})
                cur.execute(f"INSERT INTO {SCHEMA}.usdt_ledger (user_id, amount, kind, note) VALUES ({uid}, -{amount}, 'withdraw', 'Обмен виртуальных USDT на TKA')")
                cur.execute(f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({uid}, {net}, 'exchange', 'Обмен виртуальных USDT на TKA')")
                cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({uid}, {fee}, 'fee', 'Комиссия обмена USDT в TKA')")
        elif act in ("open", "limit"):
            coin = str(body.get("coinId", ""))
            side = body.get("side")
            try:
                lev = int(body.get("leverage", 1))
                margin = float(body.get("margin", 0))
            except (TypeError, ValueError):
                return resp(400, {"error": "Неверные параметры"})
            if coin not in COINS or side not in ("long", "short"):
                return resp(400, {"error": "Неверная монета или направление"})
            ex = exchange_settings(cur)
            if not ex["enabled"]:
                return resp(403, {"error": ex["message"] or "Новые сделки временно приостановлены. Закрывать позиции можно"})
            if coin in ex["disabledCoins"]:
                return resp(400, {"error": "Торговля этой монетой временно отключена"})
            if lev < 1 or lev > ex["maxLeverage"]:
                return resp(400, {"error": f"Плечо от 1 до {ex['maxLeverage']}"})
            if margin < ex["minMargin"]:
                return resp(400, {"error": f"Минимальная ставка {ex['minMargin']:g} USDT (виртуальных)"})
            fee = trade_fee(ex, margin, lev)
            sl = tp = None
            try:
                if body.get("sl") not in (None, "", 0):
                    sl = float(body["sl"])
                if body.get("tp") not in (None, "", 0):
                    tp = float(body["tp"])
            except (TypeError, ValueError):
                return resp(400, {"error": "Неверный стоп-лосс или тейк-профит"})
            ref = px.get(coin) if act == "open" else float(body.get("limit") or 0)
            if ref:
                if side == "long" and ((sl is not None and sl >= ref) or (tp is not None and tp <= ref)):
                    return resp(400, {"error": "Для лонга стоп-лосс должен быть ниже цены входа, а тейк-профит выше"})
                if side == "short" and ((sl is not None and sl <= ref) or (tp is not None and tp >= ref)):
                    return resp(400, {"error": "Для шорта стоп-лосс должен быть выше цены входа, а тейк-профит ниже"})
            if (sl is not None and sl <= 0) or (tp is not None and tp <= 0):
                return resp(400, {"error": "Уровни должны быть больше нуля"})
            cur.execute(f"SELECT balance FROM {SCHEMA}.paper_accounts WHERE user_id = {uid}")
            if margin + fee > float(cur.fetchone()[0]) + 1e-9:
                return resp(400, {"error": f"Недостаточно средств на счёте: нужно {margin + fee:.2f} с учётом комиссии {fee:.2f}" if fee > 0 else "Недостаточно средств на счёте"})
            if act == "open":
                p = px.get(coin)
                if not p:
                    return resp(503, {"error": "Курс сейчас недоступен, попробуйте через минуту"})
                size = margin * lev / p
                cur.execute(f"INSERT INTO {SCHEMA}.paper_positions (user_id, coin_id, side, leverage, margin, size, entry_price, sl, tp) VALUES ({uid}, '{coin}', '{side}', {lev}, {margin}, {size}, {p}, {sql_num(sl)}, {sql_num(tp)})")
                if fee > 0:
                    cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({uid}, {fee}, 'fee', 'Комиссия сделки')")
            else:
                try:
                    lim = float(body.get("limit", 0))
                except (TypeError, ValueError):
                    lim = 0
                if lim <= 0:
                    return resp(400, {"error": "Укажите цену ордера"})
                cur.execute(f"INSERT INTO {SCHEMA}.paper_orders (user_id, coin_id, side, leverage, margin, limit_price, sl, tp, fee) VALUES ({uid}, '{coin}', '{side}', {lev}, {margin}, {lim}, {sql_num(sl)}, {sql_num(tp)}, {fee})")
            cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance - {margin + fee} WHERE user_id = {uid}")
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
            cur.execute(f"SELECT margin, fee FROM {SCHEMA}.paper_orders WHERE id = {oid} AND user_id = {uid} AND status = 'pending'")
            r = cur.fetchone()
            if not r:
                return resp(404, {"error": "Ордер не найден"})
            cur.execute(f"UPDATE {SCHEMA}.paper_orders SET status = 'cancelled', done_at = NOW() WHERE id = {oid}")
            cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance + {float(r[0]) + float(r[1] or 0)} WHERE user_id = {uid}")
        else:
            return resp(400, {"error": "Неизвестное действие"})
        return resp(200, state(cur, uid, px))
    finally:
        cur.close()
        conn.close()
