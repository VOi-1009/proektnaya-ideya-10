import json
import time
import urllib.request

API = "https://api.coinmarketcap.com/data-api/v3"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "Accept": "application/json"}
TTL = 300
_cache: dict = {"at": 0.0, "data": None}


def fetch() -> dict:
    req = urllib.request.Request(f"{API}/exchange-asset/flow/list?convertId=2781&start=1&limit=100", headers=HEADERS)
    with urllib.request.urlopen(req, timeout=4) as r:
        d = json.loads(r.read())["data"]
    num = lambda v: float(v) if v is not None else 0.0
    items = [
        {
            "name": x.get("name", ""),
            "slug": x.get("slug", ""),
            "id": x.get("id"),
            "rank": x.get("exchangeRank"),
            "assets": num(x.get("totalAsset")),
            "oi": num(x.get("openInterestUsd")),
            "flow24h": num(x.get("netFlow24hUsd")),
            "flow7d": num(x.get("netFlow7dUsd")),
            "flow30d": num(x.get("netFlow30dUsd")),
        }
        for x in d.get("flowList", [])
    ]
    items.sort(key=lambda x: x["assets"], reverse=True)
    return {
        "items": items,
        "total24h": sum(i["flow24h"] for i in items),
        "total7d": sum(i["flow7d"] for i in items),
        "total30d": sum(i["flow30d"] for i in items),
        "updatedAt": int(time.time() * 1000),
    }


def exchange_flows_response(json_resp) -> dict:
    now = time.time()
    if _cache["data"] and now - _cache["at"] < TTL:
        return json_resp(200, _cache["data"], 120)
    try:
        data = fetch()
    except Exception as e:
        print("exchange flows error:", type(e).__name__, e)
        if _cache["data"]:
            return json_resp(200, _cache["data"], 60)
        return json_resp(502, {"error": "Данные временно недоступны"}, 30)
    _cache.update(at=now, data=data)
    return json_resp(200, data, 120)
