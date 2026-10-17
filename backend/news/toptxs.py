import json
import time
import urllib.request

TTL = 300
_cache: dict = {"at": 0.0, "data": None}
COLUMNS = [
    "base_currency", "base_currency_desc", "base_currency_logoid", "txs_count", "close",
    "24h_close_change|5", "market_cap_calc", "24h_vol_cmc", "crypto_total_rank",
]


def load(limit: int = 10) -> list:
    body = json.dumps({
        "columns": COLUMNS,
        "sort": {"sortBy": "txs_count", "sortOrder": "desc"},
        "range": [0, limit],
        "options": {"lang": "ru"},
    }).encode()
    req = urllib.request.Request(
        "https://scanner.tradingview.com/coin/scan",
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Origin": "https://ru.tradingview.com"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=4) as r:
        raw = json.loads(r.read())
    out = []
    for i, row in enumerate(raw.get("data", [])):
        d = row["d"]
        out.append({
            "place": i + 1,
            "symbol": d[0],
            "name": d[1],
            "logo": f"https://s3-symbol-logo.tradingview.com/{d[2]}.svg" if d[2] else "",
            "txs": int(d[3] or 0),
            "price": d[4],
            "change": d[5],
            "marketCap": d[6],
            "volume": d[7],
            "rank": d[8],
        })
    return out


def toptxs_response(json_resp) -> dict:
    now = time.time()
    if _cache["data"] and now - _cache["at"] < TTL:
        return json_resp(200, {"items": _cache["data"], "updatedAt": int(_cache["at"] * 1000)}, 120)
    try:
        items = load()
        if not items:
            raise ValueError("пусто")
        _cache.update(at=now, data=items)
    except Exception as e:  # noqa: BLE001
        print("toptxs error:", type(e).__name__, e)
        if not _cache["data"]:
            return json_resp(502, {"error": "Данные временно недоступны"})
    return json_resp(200, {"items": _cache["data"], "updatedAt": int(_cache["at"] * 1000)}, 120)
