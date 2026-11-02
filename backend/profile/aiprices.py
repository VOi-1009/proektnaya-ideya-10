import json
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

_cache: dict = {"at": 0.0, "data": {}}
_pause = {"until": 0.0}
TTL = 120
YAHOO = {"brent": "BZ=F", "gold": "GC=F", "usd-rub": "RUB=X", "eur-rub": "EURRUB=X"}
GECKO = {"bitcoin": "bitcoin", "ethereum": "ethereum", "solana": "solana", "toncoin": "the-open-network", "xrp": "ripple", "bnb": "binancecoin", "dogecoin": "dogecoin", "hyperliquid": "hyperliquid", "zcash": "zcash"}


def _get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=2.5) as r:
        return json.loads(r.read())


def _okx_crypto() -> dict:
    sym = {"bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL", "toncoin": "GRAM", "xrp": "XRP", "bnb": "BNB", "dogecoin": "DOGE", "hyperliquid": "HYPE", "zcash": "ZEC"}
    rows = {r["instId"]: r for r in _get("https://www.okx.com/api/v5/market/tickers?instType=SPOT").get("data") or []}
    out = {}
    for k, s in sym.items():
        r = rows.get(f"{s}-USDT")
        if r and float(r["last"]) > 0:
            last, opened = float(r["last"]), float(r.get("open24h") or 0)
            out[k] = {"price": last, "change": (last / opened - 1) * 100 if opened > 0 else 0.0}
    return out


def _crypto() -> dict:
    try:
        got = _okx_crypto()
        if len(got) >= len(GECKO) - 1:
            return got
    except Exception as e:
        print("okx error:", e)
        got = {}
    if time.time() < _pause["until"]:
        return got
    ids = ",".join(GECKO.values())
    try:
        d = _get(f"https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd&include_24hr_change=true")
    except Exception as e:
        _pause["until"] = time.time() + 300
        print("gecko error, пауза на 5 минут:", e)
        return got
    out = dict(got)
    for k, gid in GECKO.items():
        if k not in out and gid in d:
            out[k] = {"price": float(d[gid]["usd"]), "change": float(d[gid].get("usd_24h_change") or 0)}
    return out


def _yahoo(key: str) -> tuple:
    m = _get(f"https://query1.finance.yahoo.com/v8/finance/chart/{YAHOO[key]}?range=1d&interval=1h")["chart"]["result"][0]["meta"]
    price = float(m["regularMarketPrice"])
    prev = float(m.get("chartPreviousClose") or m.get("previousClose") or price)
    return key, {"price": price, "change": (price - prev) / prev * 100 if prev else 0}


def prices() -> dict:
    now = time.time()
    if _cache["data"] and now - _cache["at"] < TTL:
        return _cache["data"]
    data = {}
    with ThreadPoolExecutor(max_workers=5) as ex:
        fc = ex.submit(_crypto)
        fy = [ex.submit(_yahoo, k) for k in YAHOO]
        try:
            data.update(fc.result())
        except Exception as e:
            print("gecko error:", e)
        for f in fy:
            try:
                k, v = f.result()
                data[k] = v
            except Exception as e:
                print("yahoo error:", e)
    if data:
        _cache.update(at=now, data={**_cache["data"], **data})
    return _cache["data"]


def fmt_price(key: str, v: float) -> str:
    if key in ("usd-rub", "eur-rub"):
        return f"{v:,.2f} ₽".replace(",", " ").replace(".", ",")
    if v >= 1000:
        return f"${v:,.0f}".replace(",", " ")
    if v >= 1:
        return f"${v:,.2f}".replace(",", " ").replace(".", ",")
    return f"${v:.4f}".replace(".", ",")


def fmt_change(c: float) -> str:
    return f"{'+' if c >= 0 else ''}{c:.2f}%".replace(".", ",")
