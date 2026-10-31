import json
import time
import urllib.request

TTL = 300
API = "https://api.coinmarketcap.com/data-api/v3"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "Accept": "application/json"}
_cache: dict = {"at": 0.0, "data": None}


def _get(path: str) -> dict:
    req = urllib.request.Request(f"{API}{path}", headers=HEADERS)
    with urllib.request.urlopen(req, timeout=4) as r:
        return json.loads(r.read())


def treasuries() -> dict:
    d = _get("/coin-treasury/table?id=1&start=1&limit=500")["data"]
    rows = [x for x in d.get("data", []) if x.get("coin") == "BTC"]
    total = sum(float(x.get("holdings") or 0) for x in rows)
    top = max(rows, key=lambda x: float(x.get("holdings") or 0)) if rows else None
    supply = None
    try:
        supply = float(_get("/cryptocurrency/detail?id=1")["data"]["statistics"]["circulatingSupply"])
    except Exception as e:
        print("cmc supply error:", e)
    return {
        "total": round(total),
        "supply": round(supply) if supply else None,
        "companies": len(rows),
        "top": {"name": top["companyName"], "holdings": round(float(top["holdings"]))} if top else None,
    }


def altseason() -> dict:
    now = int(time.time())
    h = _get(f"/altcoin-season/chart?start={now - 86400 * 3}&end={now}")["data"]["historicalValues"]
    val = lambda k: int(float(h[k]["altcoinIndex"])) if h.get(k) else None
    return {"value": val("now"), "yesterday": val("yesterday"), "lastWeek": val("lastWeek"), "lastMonth": val("lastMonth")}


def liquidations() -> dict:
    d = _get("/liquidations/summary")["data"]
    num = lambda k: float(d[k]) if d.get(k) is not None else None
    return {"total": num("total"), "change24h": num("totalChange24h"), "longs": num("longs"), "shorts": num("shorts")}


def etf_flows() -> dict:
    d = _get("/etf/overview/netflow/chart?category=all&range=30d")["data"]
    num = lambda v: float(v) if v is not None else 0.0
    points = [
        {"t": int(p["timestamp"]), "btc": num(p.get("btcValue")), "eth": num(p.get("ethValue")), "total": num(p.get("value"))}
        for p in d.get("points", [])
    ]
    return {
        "points": points,
        "total": num(d.get("total")),
        "totalBtc": num(d.get("totalBtcValue")),
        "totalEth": num(d.get("totalEthValue")),
    }


def social_sentiment() -> dict:
    d = _get("/socials/overview")["data"]["socialSentiment"]
    num = lambda k: float(d[k]) if d.get(k) is not None else None
    return {
        "value": num("value"),
        "percent": num("percent"),
        "yesterday": num("valueYesterday"),
        "lastWeek": num("valueLastWeek"),
        "yearHigh": num("valueYearlyHigh"),
        "yearLow": num("valueYearlyLow"),
    }


def puell() -> dict:
    d = _get("/market-cycles/latest")["data"]
    return {"value": float(d["puellMultiple"])}


def cmc_response(json_resp) -> dict:
    now = time.time()
    if _cache["data"] and now - _cache["at"] < TTL:
        return json_resp(200, _cache["data"])
    data = dict(_cache["data"] or {})
    for key, fn in (("treasuries", treasuries), ("altseason", altseason), ("liquidations", liquidations), ("etf", etf_flows), ("social", social_sentiment), ("puell", puell)):
        try:
            data[key] = fn()
        except Exception as e:
            print(f"cmc {key} error:", e)
    if not data:
        return json_resp(502, {"error": "Данные временно недоступны"})
    data["updatedAt"] = int(now)
    _cache.update(at=now, data=data)
    return json_resp(200, data)


_hist: dict = {}


def liq_history_response(qs: dict, json_resp) -> dict:
    """История ликвидаций по всем монетам и биржам (?range=24h)"""
    rng = "24h"
    now = time.time()
    c = _hist.get(rng)
    if c and now - c[0] < 120:
        return json_resp(200, c[1], 60)
    try:
        bars = _get(f"/liquidations/chart?range={rng}")["data"]["bars"]
    except Exception as e:
        print("liq history error:", e)
        if c:
            return json_resp(200, c[1], 60)
        return json_resp(502, {"error": "История ликвидаций временно недоступна"})
    num = lambda v: float(v) if v is not None else 0.0
    out = [
        {"t": int(b["timestamp"]) * 1000, "longs": num(b.get("totalLongs")), "shorts": num(b.get("totalShorts")),
         "price": num(b.get("coinPrice")) or None}
        for b in bars
    ]
    data = {"bars": out, "totalLongs": sum(x["longs"] for x in out), "totalShorts": sum(x["shorts"] for x in out), "updatedAt": int(now)}
    _hist[rng] = (now, data)
    return json_resp(200, data, 60)
