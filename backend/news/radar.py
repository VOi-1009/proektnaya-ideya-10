import json
import re
import time
import urllib.request

RANGES = {
    "1d": {"binance": "5m", "bybit": "5min", "kline_bybit": "5", "limit": 288},
    "3d": {"binance": "15m", "bybit": "15min", "kline_bybit": "15", "limit": 288},
    "7d": {"binance": "1h", "bybit": "1h", "kline_bybit": "60", "limit": 168},
    "30d": {"binance": "4h", "bybit": "4h", "kline_bybit": "240", "limit": 180},
}
LEVERAGE = [(5, 0.08), (10, 0.25), (25, 0.30), (50, 0.22), (100, 0.15)]
ROWS = 140
TTL = 60
SYMBOL_RE = re.compile(r"^[A-Z0-9]{3,20}$")
_cache: dict = {}


def get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (TraderkaRadar)"})
    with urllib.request.urlopen(req, timeout=4) as r:
        return json.loads(r.read())


def from_binance(symbol: str, cfg: dict) -> tuple:
    k = get_json(f"https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval={cfg['binance']}&limit={cfg['limit'] + 1}")
    oi = get_json(
        f"https://fapi.binance.com/futures/data/openInterestHist?symbol={symbol}&period={cfg['binance']}&limit={min(cfg['limit'] + 1, 500)}"
    )
    candles = [(int(x[0]), float(x[1]), float(x[2]), float(x[3]), float(x[4])) for x in k]
    oi_map = {int(x["timestamp"]): float(x["sumOpenInterestValue"]) for x in oi}
    return candles, oi_map, "Binance"


def from_bybit(symbol: str, cfg: dict) -> tuple:
    lim = min(cfg["limit"] + 1, 200)
    k = get_json(f"https://api.bybit.com/v5/market/kline?category=linear&symbol={symbol}&interval={cfg['kline_bybit']}&limit={lim}")
    oi = get_json(
        f"https://api.bybit.com/v5/market/open-interest?category=linear&symbol={symbol}&intervalTime={cfg['bybit']}&limit={lim}"
    )
    candles = sorted((int(x[0]), float(x[1]), float(x[2]), float(x[3]), float(x[4])) for x in k["result"]["list"])
    oi_map = {}
    for x in oi["result"]["list"]:
        ts = int(x["timestamp"])
        price = next((c[4] for c in candles if c[0] == ts), candles[-1][4] if candles else 0)
        oi_map[ts] = float(x["openInterest"]) * price
    return candles, oi_map, "Bybit"


def build(symbol: str, rng: str, binance_only: bool = False) -> dict:
    cfg = RANGES[rng]
    if binance_only:
        candles, oi_map, source = from_binance(symbol, cfg)
    else:
        try:
            candles, oi_map, source = from_binance(symbol, cfg)
        except Exception as e:  # noqa: BLE001
            print("binance radar error:", type(e).__name__, e)
            candles, oi_map, source = from_bybit(symbol, cfg)
    if len(candles) < 10:
        raise ValueError("Мало данных")

    lo = min(c[3] for c in candles)
    hi = max(c[2] for c in candles)
    span = hi - lo
    p_min = max(lo - span * 0.6, lo * 0.85)
    p_max = min(hi + span * 0.6, hi * 1.15)
    step = (p_max - p_min) / ROWS

    def row(price: float) -> int:
        return int((price - p_min) / step)

    longs = [0.0] * ROWS
    shorts = [0.0] * ROWS
    grid = []
    liquidated_long = 0.0
    liquidated_short = 0.0
    prev_oi = None
    for ts, o, h, l, c in candles:
        cur_oi = oi_map.get(ts)
        if cur_oi is not None and prev_oi is not None:
            d = cur_oi - prev_oi
            if d > 0:
                entry = (o + h + l + c) / 4
                for lev, w in LEVERAGE:
                    part = d * w / 2
                    rl = row(entry * (1 - 1 / lev))
                    rs = row(entry * (1 + 1 / lev))
                    if 0 <= rl < ROWS:
                        longs[rl] += part
                    if 0 <= rs < ROWS:
                        shorts[rs] += part
            elif d < 0 and prev_oi > 0:
                k = max(0.0, 1 + d / prev_oi)
                longs = [v * k for v in longs]
                shorts = [v * k for v in shorts]
        if cur_oi is not None:
            prev_oi = cur_oi
        lo_row = max(row(l), 0)
        for r in range(lo_row, ROWS):
            if longs[r]:
                liquidated_long += longs[r]
                longs[r] = 0.0
        hi_row = min(row(h), ROWS - 1)
        for r in range(0, hi_row + 1):
            if shorts[r]:
                liquidated_short += shorts[r]
                shorts[r] = 0.0
        grid.append([longs[i] + shorts[i] for i in range(ROWS)])

    grid = grid[1:]
    candles = candles[1:]
    peak = max((max(col) for col in grid), default=0) or 1
    matrix = [[round(v / peak * 1000) for v in col] for col in grid]

    last = candles[-1][4]
    levels = []
    for i in range(ROWS):
        v = longs[i] + shorts[i]
        if v > 0:
            levels.append({"price": round(p_min + (i + 0.5) * step, 2), "usd": round(v), "side": "long" if longs[i] >= shorts[i] else "short"})
    above = sorted([x for x in levels if x["price"] > last], key=lambda x: -x["usd"])[:3]
    below = sorted([x for x in levels if x["price"] < last], key=lambda x: -x["usd"])[:3]

    return {
        "symbol": symbol,
        "range": rng,
        "source": source,
        "priceMin": p_min,
        "priceMax": p_max,
        "rows": ROWS,
        "peakUsd": round(peak),
        "times": [c[0] for c in candles],
        "candles": [[c[1], c[2], c[3], c[4]] for c in candles],
        "matrix": matrix,
        "price": last,
        "above": sorted(above, key=lambda x: x["price"]),
        "below": sorted(below, key=lambda x: -x["price"]),
        "liquidatedLong": round(liquidated_long),
        "liquidatedShort": round(liquidated_short),
        "updatedAt": int(time.time() * 1000),
        "_longs": longs,
        "_shorts": shorts,
        "_step": step,
    }


def public(data: dict) -> dict:
    return {k: v for k, v in data.items() if not k.startswith("_")}


def heatmap_response(qs: dict, json_resp) -> dict:
    symbol = str(qs.get("symbol", "BTCUSDT")).upper()
    rng = str(qs.get("range", "3d"))
    if not SYMBOL_RE.match(symbol):
        return json_resp(400, {"error": "Некорректный тикер"})
    if rng not in RANGES:
        rng = "3d"
    key = f"{symbol}:{rng}"
    now = time.time()
    cached = _cache.get(key)
    if cached and now - cached[0] < TTL:
        return json_resp(200, public(cached[1]), 60)
    try:
        data = build(symbol, rng)
    except Exception as e:  # noqa: BLE001
        print("radar error:", type(e).__name__, e)
        if cached:
            return json_resp(200, public(cached[1]), 30)
        return json_resp(502, {"error": "Данные бирж временно недоступны"})
    _cache[key] = (now, data)
    return json_resp(200, public(data), 60)



def liqmap_response(qs: dict, json_resp) -> dict:
    symbol = str(qs.get("symbol", "BTCUSDT")).upper()
    rng = str(qs.get("range", "3d"))
    if not SYMBOL_RE.match(symbol):
        return json_resp(400, {"error": "Некорректный тикер"})
    if rng not in RANGES:
        rng = "3d"
    key = f"map:{symbol}:{rng}"
    now = time.time()
    cached = _cache.get(key)
    if cached and now - cached[0] < TTL:
        return json_resp(200, cached[1], 60)
    try:
        d = build(symbol, rng, binance_only=True)
    except Exception as e:  # noqa: BLE001
        print("liqmap error:", type(e).__name__, e)
        if cached:
            return json_resp(200, cached[1], 30)
        return json_resp(502, {"error": "Данные Binance временно недоступны"})
    longs, shorts, step = d["_longs"], d["_shorts"], d["_step"]
    price = d["price"]
    bars = []
    for i in range(ROWS):
        p = d["priceMin"] + (i + 0.5) * step
        lv, sv = longs[i], shorts[i]
        if p < price:
            sv = 0.0
        else:
            lv = 0.0
        bars.append({"price": round(p, 2), "long": round(lv), "short": round(sv)})
    acc = 0.0
    for b in sorted((b for b in bars if b["price"] < price), key=lambda b: -b["price"]):
        acc += b["long"]
        b["cumLong"] = round(acc)
    acc = 0.0
    for b in sorted((b for b in bars if b["price"] >= price), key=lambda b: b["price"]):
        acc += b["short"]
        b["cumShort"] = round(acc)
    data = {
        "symbol": symbol,
        "range": rng,
        "source": "Binance",
        "price": price,
        "bars": bars,
        "totalLong": round(sum(b["long"] for b in bars)),
        "totalShort": round(sum(b["short"] for b in bars)),
        "updatedAt": d["updatedAt"],
    }
    _cache[key] = (now, data)
    return json_resp(200, data, 60)
