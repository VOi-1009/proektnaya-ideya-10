import math
import os
import random
import re
import time

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")

STATUS_RU = {"draft": "Черновик", "scheduled": "Ожидает старта", "trading": "Торгуется", "halted": "Торги остановлены", "delisted": "Снята с торгов"}
INTERVAL_S = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400}
TICK_S = 60
LEVELS_N = 12
_cache = {"at": 0.0, "data": None}


def q(v) -> str:
    return str(v).replace("'", "''").replace("\\", "")


def f(v, d=0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


def iso(dt) -> str:
    return dt.isoformat() + "Z" if dt else ""


COLS = (
    "id, slug, symbol, name, description, color, icon_url, status, listing_at, start_price, price, day_open, day_open_at, "
    "high_24h, low_24h, volume_24h, total_supply, volatility, drift, liquidity, spread_pct, tick_size, max_leverage, min_level, "
    "allow_short, min_margin, max_margin, fee_percent, anchor_coin, anchor_beta, halted, sort, last_tick_at"
)


def row(r) -> dict:
    return {
        "id": r[0], "slug": r[1], "symbol": r[2], "name": r[3], "description": r[4], "color": r[5], "iconUrl": r[6], "status": r[7],
        "listingAt": iso(r[8]), "startPrice": f(r[9]), "price": f(r[10]), "dayOpen": f(r[11]), "dayOpenAt": iso(r[12]),
        "high24h": f(r[13]), "low24h": f(r[14]), "volume24h": f(r[15]), "totalSupply": f(r[16]), "volatility": f(r[17]), "drift": f(r[18]),
        "liquidity": f(r[19]), "spreadPct": f(r[20]), "tickSize": f(r[21]), "maxLeverage": int(r[22]), "minLevel": int(r[23]),
        "allowShort": bool(r[24]), "minMargin": f(r[25]), "maxMargin": f(r[26]), "feePercent": f(r[27], -1), "anchorCoin": r[28],
        "anchorBeta": f(r[29], 1), "halted": bool(r[30]), "sort": int(r[31]), "lastTickAt": iso(r[32]),
    }


def all_rows(cur, only_live=False) -> list:
    cond = "WHERE status IN ('trading', 'halted')" if only_live else ""
    cur.execute(f"SELECT {COLS} FROM {SCHEMA}.listings {cond} ORDER BY sort, id")
    return [row(r) for r in cur.fetchall()]


def get(cur, lid=None, slug=None):
    cond = f"id = {int(lid)}" if lid is not None else f"slug = '{q(slug)}'"
    cur.execute(f"SELECT {COLS} FROM {SCHEMA}.listings WHERE {cond}")
    r = cur.fetchone()
    return row(r) if r else None


def live_ids(cur) -> set:
    cur.execute(f"SELECT slug FROM {SCHEMA}.listings WHERE status IN ('trading', 'halted')")
    return {r[0] for r in cur.fetchall()}


def tradable_slugs(cur) -> set:
    cur.execute(f"SELECT slug FROM {SCHEMA}.listings WHERE status = 'trading' AND NOT halted")
    return {r[0] for r in cur.fetchall()}


def open_prices(cur) -> dict:
    now = time.time()
    if _cache["data"] is not None and now - _cache["at"] < 5:
        return _cache["data"]
    cur.execute(f"SELECT slug, price FROM {SCHEMA}.listings WHERE status IN ('trading', 'halted')")
    data = {r[0]: f(r[1]) for r in cur.fetchall()}
    _cache.update(at=now, data=data)
    return data


def drop_cache() -> None:
    _cache.update(at=0.0, data=None)


def decimals(price: float) -> int:
    if price >= 1000:
        return 2
    if price >= 1:
        return 4
    if price >= 0.01:
        return 6
    return 9


def snap(price: float, tick: float) -> float:
    if tick and tick > 0:
        return round(round(price / tick) * tick, 12)
    return round(price, decimals(price))


def level_text(n: int) -> str:
    return str(n)


def step_price(l: dict, anchor_change: float, dt_min: float) -> float:
    """Один шаг случайного блуждания: волатильность, дрейф и связь с эталонной монетой."""
    vol = max(0.0, l["volatility"]) / 100.0
    sigma = vol * math.sqrt(max(dt_min, 0.1) / 60.0)
    shock = random.gauss(0, 1) * sigma
    drift = l["drift"] / 100.0 * dt_min / 60.0
    pull = 0.0
    if l["anchorCoin"] and anchor_change:
        pull = (anchor_change / 100.0) * l["anchorBeta"]
    p = l["price"] * math.exp(shock + drift + pull)
    lo = l["startPrice"] * 0.001
    return max(lo, p)


def volume_for(l: dict, move: float) -> float:
    base = l["liquidity"] / 1440.0
    return round(base * (1 + abs(move) * 40) * random.uniform(0.6, 1.4), 2)


def tick_one(cur, l: dict, anchor_prices: dict, now: float) -> dict:
    last = time.mktime(time.strptime(l["lastTickAt"][:19], "%Y-%m-%dT%H:%M:%S")) if l["lastTickAt"] else now - TICK_S
    steps = int(max(1, min(60, (now - last) // TICK_S)))
    price = l["price"]
    high, low = l["high24h"] or price, l["low24h"] or price
    vol_add = 0.0
    prev_anchor = anchor_prices.get(l["anchorCoin"] + ":prev") if l["anchorCoin"] else None
    cur_anchor = anchor_prices.get(l["anchorCoin"]) if l["anchorCoin"] else None
    a_change = ((cur_anchor / prev_anchor - 1) * 100) if prev_anchor and cur_anchor and prev_anchor > 0 else 0.0
    t_ms = int(last * 1000)
    cur.execute(f"SELECT COALESCE(MAX(t), 0) FROM {SCHEMA}.listing_ticks WHERE listing_id = {l['id']}")
    t_ms = max(t_ms, int(cur.fetchone()[0]))
    values = []
    for _ in range(steps):
        cand = dict(l, price=price)
        new = snap(step_price(cand, a_change / steps, 1.0), l["tickSize"])
        v = volume_for(l, new / price - 1 if price else 0)
        vol_add += v
        price = new
        high, low = max(high, price), min(low, price)
        t_ms += TICK_S * 1000
        values.append(f"({l['id']}, {t_ms}, {price}, {v})")
    cur.execute(f"INSERT INTO {SCHEMA}.listing_ticks (listing_id, t, price, volume) VALUES {', '.join(values)}")
    cur.execute(
        f"UPDATE {SCHEMA}.listings SET price = {price}, high_24h = {high}, low_24h = {low}, volume_24h = volume_24h + {round(vol_add, 2)}, "
        f"last_tick_at = NOW() WHERE id = {l['id']}"
    )
    return {"price": price, "steps": steps}


def roll_day(cur, l: dict) -> None:
    cur.execute(
        f"UPDATE {SCHEMA}.listings SET day_open = price, day_open_at = NOW(), high_24h = price, low_24h = price, volume_24h = 0 "
        f"WHERE id = {l['id']} AND (day_open_at IS NULL OR day_open_at < NOW() - INTERVAL '24 hours')"
    )


def refresh_book(cur, l: dict) -> None:
    """Пересобирает «стену» заявок вокруг цены: уровни растут по объёму от центра."""
    cur.execute(f"DELETE FROM {SCHEMA}.listing_book WHERE listing_id = {l['id']} AND kind = 'wall'")
    price = l["price"]
    spread = max(l["spreadPct"], 0.01) / 100.0
    depth = max(l["liquidity"], 100.0)
    rows = []
    for side, sign in (("bid", -1), ("ask", 1)):
        for i in range(LEVELS_N):
            gap = spread / 2 + i * spread * 0.9
            lvl = snap(price * (1 + sign * gap), l["tickSize"])
            if lvl <= 0:
                continue
            usd = depth * (0.04 + 0.018 * i) * random.uniform(0.7, 1.3) / LEVELS_N * 3
            qty = round(usd / lvl, 6)
            rows.append(f"({l['id']}, '{side}', {lvl}, {qty}, 'wall')")
    if rows:
        cur.execute(f"INSERT INTO {SCHEMA}.listing_book (listing_id, side, price, qty, kind) VALUES {', '.join(rows)}")


def book(cur, l: dict) -> dict:
    cur.execute(f"SELECT side, price, SUM(qty) FROM {SCHEMA}.listing_book WHERE listing_id = {l['id']} GROUP BY side, price")
    bids, asks = [], []
    for side, price, qty in cur.fetchall():
        (bids if side == "bid" else asks).append([f(price), f(qty)])
    bids.sort(key=lambda x: -x[0])
    asks.sort(key=lambda x: x[0])
    for arr in (bids, asks):
        total = 0.0
        for lvl in arr:
            total += lvl[1]
            lvl.append(round(total, 6))
    best_bid = bids[0][0] if bids else l["price"]
    best_ask = asks[0][0] if asks else l["price"]
    return {"bids": bids[:15], "asks": asks[:15], "bestBid": best_bid, "bestAsk": best_ask, "mid": l["price"], "price": l["price"]}


def fill(cur, l: dict, side: str, usd_notional: float) -> dict:
    """Исполняет рыночную заявку по стакану: средняя цена с проскальзыванием, стакан «съедается»."""
    b = book(cur, l)
    levels = list(b["asks"] if side == "long" else b["bids"])
    if not levels:
        return {"ok": False, "error": "В стакане нет заявок, торговля временно невозможна"}
    need_usd = usd_notional
    spent, qty = 0.0, 0.0
    eaten = []
    for price, avail, _ in levels:
        take_usd = min(need_usd, price * avail)
        take_qty = take_usd / price
        spent += take_usd
        qty += take_qty
        need_usd -= take_usd
        eaten.append((price, take_qty))
        if need_usd <= 1e-9:
            break
    if need_usd > 1e-6:
        return {"ok": False, "error": "Заявка больше, чем есть в стакане. Уменьшите сумму или плечо"}
    avg = spent / qty
    ref = b["bestAsk"] if side == "long" else b["bestBid"]
    slip = abs(avg / ref - 1) * 100 if ref else 0.0
    for price, take_qty in eaten:
        cur.execute(
            f"UPDATE {SCHEMA}.listing_book SET qty = GREATEST(qty - {take_qty}, 0) WHERE listing_id = {l['id']} AND side = '{'ask' if side == 'long' else 'bid'}' "
            f"AND price = {price}"
        )
    cur.execute(f"DELETE FROM {SCHEMA}.listing_book WHERE listing_id = {l['id']} AND qty <= 0.0000001")
    return {"ok": True, "avg": avg, "qty": qty, "slippage": slip, "bestRef": ref}


def impact_price(l: dict, side: str, usd: float, slip_pct: float) -> float:
    """Небольшое смещение цены после крупной сделки: рынок реагирует на давление."""
    k = min(0.03, (usd / max(l["liquidity"], 1.0)) * 0.05)
    return snap(l["price"] * (1 + (k if side == "long" else -k)), l["tickSize"])


def record_trade(cur, l: dict, uid, side: str, price: float, qty: float, slip: float) -> None:
    cur.execute(
        f"INSERT INTO {SCHEMA}.listing_trades (listing_id, user_id, side, price, qty, slippage) "
        f"VALUES ({l['id']}, {int(uid) if uid else 'NULL'}, '{side}', {price}, {round(qty, 6)}, {round(slip, 4)})"
    )
    new_price = impact_price(l, side, price * qty, slip)
    cur.execute(
        f"UPDATE {SCHEMA}.listings SET price = {new_price}, volume_24h = volume_24h + {round(price * qty, 2)}, "
        f"high_24h = GREATEST(high_24h, {new_price}), low_24h = CASE WHEN low_24h = 0 THEN {new_price} ELSE LEAST(low_24h, {new_price}) END "
        f"WHERE id = {l['id']}"
    )
    drop_cache()


def anchor_prices(px: dict, rows: list) -> dict:
    out = {}
    for l in rows:
        c = l["anchorCoin"]
        if c and c in px:
            out[c] = px[c]
            prev = _anchor_prev.get(c)
            out[c + ":prev"] = prev if prev else px[c]
            _anchor_prev[c] = px[c]
    return out


_anchor_prev: dict = {}


def run(cur, px: dict, force_book: bool = False) -> dict:
    """Один шаг жизни листинга: запуск по расписанию, движение цены, смена суток, обновление стакана."""
    out = {"started": 0, "ticked": 0}
    cur.execute(
        f"UPDATE {SCHEMA}.listings SET status = 'trading', day_open = price, day_open_at = NOW(), high_24h = price, low_24h = price, "
        f"last_tick_at = NOW() WHERE status = 'scheduled' AND listing_at IS NOT NULL AND listing_at <= NOW() RETURNING id"
    )
    started = [r[0] for r in cur.fetchall()]
    out["started"] = len(started)
    rows = all_rows(cur, only_live=True)
    anchors = anchor_prices(px, rows)
    now = time.time()
    for l in rows:
        if l["id"] in started:
            cur.execute(f"INSERT INTO {SCHEMA}.listing_ticks (listing_id, t, price, volume) VALUES ({l['id']}, {int(now * 1000)}, {l['price']}, 0)")
            refresh_book(cur, l)
            continue
        if l["status"] == "halted" or l["halted"]:
            continue
        last = time.mktime(time.strptime(l["lastTickAt"][:19], "%Y-%m-%dT%H:%M:%S")) if l["lastTickAt"] else 0
        if now - last >= TICK_S - 1:
            res = tick_one(cur, l, anchors, now)
            l = dict(l, price=res["price"])
            out["ticked"] += 1
            roll_day(cur, l)
            refresh_book(cur, l)
        elif force_book:
            refresh_book(cur, l)
    cur.execute(f"DELETE FROM {SCHEMA}.listing_ticks WHERE t < {int((now - 8 * 86400) * 1000)}")
    drop_cache()
    return out


def candles(cur, l: dict, interval: str) -> list:
    sec = INTERVAL_S.get(interval, 3600)
    cur.execute(
        f"SELECT (t / {sec * 1000}) * {sec * 1000} AS bucket, (ARRAY_AGG(price ORDER BY t ASC))[1], MAX(price), MIN(price), "
        f"(ARRAY_AGG(price ORDER BY t DESC))[1], SUM(volume) FROM {SCHEMA}.listing_ticks WHERE listing_id = {l['id']} "
        f"GROUP BY bucket ORDER BY bucket DESC LIMIT 300"
    )
    rows = [[int(r[0]), f(r[1]), f(r[2]), f(r[3]), f(r[4]), f(r[5])] for r in cur.fetchall()]
    rows.reverse()
    for i in range(1, len(rows)):
        rows[i][1] = rows[i - 1][4]
        rows[i][2] = max(rows[i][2], rows[i][1])
        rows[i][3] = min(rows[i][3], rows[i][1])
    return rows


def line(cur, l: dict, days: int) -> list:
    sec = max(60, int(days * 86400 / 160))
    cur.execute(
        f"SELECT (t / {sec * 1000}) * {sec * 1000} AS bucket, (ARRAY_AGG(price ORDER BY t DESC))[1] FROM {SCHEMA}.listing_ticks "
        f"WHERE listing_id = {l['id']} AND t >= {int((time.time() - days * 86400) * 1000)} GROUP BY bucket ORDER BY bucket"
    )
    return [[int(r[0]), f(r[1])] for r in cur.fetchall()]


def as_coin(l: dict) -> dict:
    """Монета в формате «Котировок» сайта, чтобы таблица, график и тикер работали без изменений."""
    base = l["dayOpen"] or l["startPrice"] or l["price"]
    change = (l["price"] / base - 1) * 100 if base else 0.0
    return {
        "id": l["slug"], "symbol": l["symbol"].lower(), "name": l["name"], "image": l["iconUrl"],
        "current_price": l["price"], "market_cap": round(l["price"] * l["totalSupply"], 2), "total_volume": l["volume24h"],
        "high_24h": l["high24h"] or l["price"], "low_24h": l["low24h"] or l["price"], "price_change_percentage_24h": round(change, 3),
        "listing": {"color": l["color"], "status": l["status"], "listingAt": l["listingAt"], "isNew": True},
    }


def public_item(l: dict) -> dict:
    out = {k: v for k, v in l.items() if k not in ("lastTickAt",)}
    base = l["dayOpen"] or l["startPrice"] or l["price"]
    out["change24h"] = round((l["price"] / base - 1) * 100, 3) if base else 0.0
    out["marketCap"] = round(l["price"] * l["totalSupply"], 2)
    out["statusRu"] = STATUS_RU.get(l["status"], l["status"])
    return out


def spark(cur, l: dict, points: int = 60, days: int = 7) -> list:
    sec = max(60, int(days * 86400 / points))
    cur.execute(
        f"SELECT (ARRAY_AGG(price ORDER BY t DESC))[1] FROM {SCHEMA}.listing_ticks WHERE listing_id = {l['id']} "
        f"AND t >= {int((time.time() - days * 86400) * 1000)} GROUP BY t / {sec * 1000} ORDER BY t / {sec * 1000}"
    )
    out = [f(r[0]) for r in cur.fetchall()]
    return out if len(out) > 1 else [l["startPrice"], l["price"]]


def public_list(cur) -> dict:
    run_due(cur)
    rows = all_rows(cur)
    visible = [l for l in rows if l["status"] in ("scheduled", "trading", "halted")]
    coins = []
    for l in rows:
        if l["status"] not in ("trading", "halted"):
            continue
        c = as_coin(l)
        sp = spark(cur, l)
        c["sparkline_in_7d"] = {"price": sp}
        c["price_change_percentage_7d_in_currency"] = round((sp[-1] / sp[0] - 1) * 100, 3) if sp and sp[0] else 0.0
        coins.append(c)
    return {"items": [public_item(l) for l in visible], "coins": coins}


def run_due(cur) -> None:
    cur.execute(
        f"UPDATE {SCHEMA}.listings SET status = 'trading', day_open = price, day_open_at = NOW(), high_24h = price, low_24h = price, "
        f"last_tick_at = NOW() WHERE status = 'scheduled' AND listing_at IS NOT NULL AND listing_at <= NOW()"
    )


def settings_for_exchange(cur, uid_level: int, is_admin: bool) -> dict:
    out = {}
    for l in all_rows(cur):
        if l["status"] not in ("trading", "halted"):
            continue
        out[l["slug"]] = {
            "maxLeverage": l["maxLeverage"], "minLevel": l["minLevel"], "allowShort": l["allowShort"], "minMargin": l["minMargin"],
            "maxMargin": l["maxMargin"], "halted": l["halted"] or l["status"] == "halted", "locked": (l["minLevel"] if (l["minLevel"] > uid_level and not is_admin) else 0),
        }
    return out


SLUG_RE = re.compile(r"[^a-z0-9-]+")


def clean_input(body: dict, creating: bool) -> dict:
    name = str(body.get("name") or "").strip()[:60]
    symbol = re.sub(r"[^A-Za-z0-9]", "", str(body.get("symbol") or "")).upper()[:12]
    if len(name) < 2:
        raise ValueError("Название — минимум 2 символа")
    if len(symbol) < 2:
        raise ValueError("Тикер — минимум 2 латинские буквы или цифры")
    price = f(body.get("startPrice"))
    if price <= 0:
        raise ValueError("Укажите стартовую цену больше нуля")
    color = str(body.get("color") or "#F97316")
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", color):
        color = "#F97316"
    status = str(body.get("status") or "draft")
    if status not in ("draft", "scheduled", "trading", "halted", "delisted"):
        status = "draft"
    listing_at = str(body.get("listingAt") or "").strip()[:19].replace("T", " ")
    if status == "scheduled" and not listing_at:
        raise ValueError("Для отложенного старта укажите дату и время запуска")
    out = {
        "name": name, "symbol": symbol, "description": str(body.get("description") or "").strip()[:600], "color": color,
        "status": status, "listing_at": listing_at, "start_price": price,
        "total_supply": max(0.0, min(f(body.get("totalSupply")), 1e15)),
        "volatility": max(0.0, min(f(body.get("volatility"), 1.5), 50.0)),
        "drift": max(-20.0, min(f(body.get("drift")), 20.0)),
        "liquidity": max(100.0, min(f(body.get("liquidity"), 100000.0), 1e10)),
        "spread_pct": max(0.01, min(f(body.get("spreadPct"), 0.2), 10.0)),
        "tick_size": max(0.0, f(body.get("tickSize"))),
        "max_leverage": max(1, min(int(f(body.get("maxLeverage"), 5)), 100)),
        "min_level": max(1, min(int(f(body.get("minLevel"), 1)), 20)),
        "allow_short": bool(body.get("allowShort", True)),
        "min_margin": max(0.01, f(body.get("minMargin"), 1.0)),
        "max_margin": max(0.0, f(body.get("maxMargin"))),
        "fee_percent": f(body.get("feePercent"), -1),
        "anchor_coin": str(body.get("anchorCoin") or "")[:40],
        "anchor_beta": max(0.0, min(f(body.get("anchorBeta"), 1.0), 5.0)),
        "sort": int(f(body.get("sort"))),
    }
    if creating:
        base = SLUG_RE.sub("-", symbol.lower()).strip("-") or "coin"
        out["slug"] = f"x-{base}"
    return out
