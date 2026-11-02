import json
import os
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

SYMBOLS = {
    "bitcoin": "BTCUSDT", "ethereum": "ETHUSDT", "binancecoin": "BNBUSDT", "ripple": "XRPUSDT",
    "solana": "SOLUSDT", "dogecoin": "DOGEUSDT", "hyperliquid": "HYPEUSDT", "zcash": "ZECUSDT",
    "tron": "TRXUSDT", "cardano": "ADAUSDT", "chainlink": "LINKUSDT", "stellar": "XLMUSDT",
    "avalanche-2": "AVAXUSDT", "sui": "SUIUSDT", "shiba-inu": "SHIBUSDT",
    "the-open-network": "GRAMUSDT", "hedera-hashgraph": "HBARUSDT", "litecoin": "LTCUSDT",
}
BINANCE = "https://data-api.binance.vision/api/v3"
GECKO = "https://api.coingecko.com/api/v3"
TTL_MARKETS = 60
TTL_GECKO = 300
TTL_CHART = 120
KLINES = {1: ("5m", 288), 7: ("1h", 168), 30: ("4h", 180), 90: ("12h", 180), 365: ("1d", 365)}
_cache: dict = {"markets": (0.0, None), "gecko": (0.0, None)}
_charts: dict = {}
_pause = {"until": 0.0}


def get_json(url: str, headers: dict = None, timeout: int = 4):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def gecko_data() -> dict:
    now = time.time()
    at, cached = _cache["gecko"]
    if cached is not None and now - at < TTL_GECKO:
        return cached
    if now < _pause["until"]:
        return cached or {}
    headers = {}
    key = os.environ.get("COINGECKO_API_KEY")
    if key:
        headers["x-cg-demo-api-key"] = key
    ids = ",".join(SYMBOLS)
    try:
        raw = get_json(
            f"{GECKO}/coins/markets?vs_currency=usd&ids={ids}&sparkline=true&price_change_percentage=1h,24h,7d",
            headers,
        )
        data = {c["id"]: c for c in raw}
        _cache["gecko"] = (now, data)
        return data
    except Exception as e:
        _pause["until"] = now + 300
        print("gecko error, пауза на 5 минут:", type(e).__name__, e)
        return cached or {}


def binance_data() -> dict:
    symbols = json.dumps(list(SYMBOLS.values()), separators=(",", ":"))
    raw = get_json(f"{BINANCE}/ticker/24hr?symbols={urllib.request.quote(symbols)}")
    return {x["symbol"]: x for x in raw}


def build() -> list:
    with ThreadPoolExecutor(max_workers=2) as ex:
        fb = ex.submit(binance_data)
        fg = ex.submit(gecko_data)
        tickers = fb.result()
        gecko = fg.result()
    items = []
    for cid, sym in SYMBOLS.items():
        t = tickers.get(sym)
        g = gecko.get(cid, {})
        if not t and not g:
            continue
        price = float(t["lastPrice"]) if t else g.get("current_price", 0)
        item = {
            "id": cid,
            "symbol": sym[:-4].lower(),
            "name": g.get("name", sym[:-4]),
            "image": g.get("image") or f"/coins/{cid}.png",
            "current_price": price,
            "market_cap": g.get("market_cap", 0),
            "total_volume": float(t["quoteVolume"]) if t else g.get("total_volume", 0),
            "high_24h": float(t["highPrice"]) if t else g.get("high_24h", price),
            "low_24h": float(t["lowPrice"]) if t else g.get("low_24h", price),
            "price_change_percentage_24h": float(t["priceChangePercent"]) if t else g.get("price_change_percentage_24h", 0),
        }
        if g.get("price_change_percentage_1h_in_currency") is not None:
            item["price_change_percentage_1h_in_currency"] = g["price_change_percentage_1h_in_currency"]
        if g.get("price_change_percentage_7d_in_currency") is not None:
            item["price_change_percentage_7d_in_currency"] = g["price_change_percentage_7d_in_currency"]
        if g.get("sparkline_in_7d"):
            item["sparkline_in_7d"] = g["sparkline_in_7d"]
        items.append(item)
    return items


def markets_response(json_resp) -> dict:
    now = time.time()
    at, cached = _cache["markets"]
    if cached is not None and now - at < TTL_MARKETS:
        return json_resp(200, {"items": cached}, 60)
    try:
        items = build()
        if not items:
            raise ValueError("empty")
        _cache["markets"] = (now, items)
        return json_resp(200, {"items": items}, 60)
    except Exception as e:
        print("markets error:", type(e).__name__, e)
        if cached:
            return json_resp(200, {"items": cached}, 30)
        return json_resp(502, {"error": "Котировки временно недоступны"}, 30)


def coinchart_response(qs: dict, json_resp) -> dict:
    cid = str(qs.get("id", ""))
    sym = SYMBOLS.get(cid)
    if not sym:
        return json_resp(400, {"error": "Неизвестная монета"})
    try:
        days = int(qs.get("days", "7"))
    except ValueError:
        days = 7
    days = min(KLINES, key=lambda d: abs(d - days))
    key = f"{cid}:{days}"
    now = time.time()
    hit = _charts.get(key)
    if hit and now - hit[0] < TTL_CHART:
        return json_resp(200, {"prices": hit[1]}, 60)
    interval, limit = KLINES[days]
    try:
        k = get_json(f"{BINANCE}/klines?symbol={sym}&interval={interval}&limit={limit}")
        prices = [[int(x[0]), float(x[4])] for x in k]
    except Exception as e:
        print("coinchart error:", type(e).__name__, e)
        if hit:
            return json_resp(200, {"prices": hit[1]}, 30)
        return json_resp(502, {"error": "График временно недоступен"}, 30)
    _charts[key] = (now, prices)
    return json_resp(200, {"prices": prices}, 60)
