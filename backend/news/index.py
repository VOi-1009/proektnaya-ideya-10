import hashlib
import html
import json
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from email.utils import parsedate_to_datetime

from radar import heatmap_response, liqmap_response
from exchange_flows import exchange_flows_response
from toptxs import toptxs_response
from cmc import cmc_response, liq_history_response
from econ_calendar import calendar_response
from markets import coinchart_response, markets_response

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}

FEEDS = {
    "crypto": [
        ("Bits.media", "https://bits.media/rss2/"),
        ("Investing.com", "https://ru.investing.com/rss/news_11.rss"),
        ("Investing.com", "https://ru.investing.com/rss/commodities_Metals.rss"),
        ("Ведомости", "https://www.vedomosti.ru/rss/news"),
        ("Финам", "https://www.finam.ru/analysis/conews/rsspoint/"),
    ],
    "world": [
        ("ТАСС", "https://tass.ru/rss/v2.xml"),
        ("Lenta.ru", "https://lenta.ru/rss/news/world"),
        ("РБК", "https://rssexport.rbc.ru/rbcnews/news/30/full.rss"),
        ("Ведомости", "https://www.vedomosti.ru/rss/news"),
    ],
}

COMMODITY_SOURCES = {"Investing.com", "Ведомости", "Финам"}
OIL_RX = r"(?<![а-яё])нефт|brent|\bwti\b|(?<![а-яё])опек\+?|\bopec|баррел"
GOLD_RX = r"(?<![а-яё])золот(о|а|у|ом|е)?(?![а-яё])|\bgold\b|\bxau\b|драгметалл"

NS = {"dc": "http://purl.org/dc/elements/1.1/", "media": "http://search.yahoo.com/mrss/"}

CACHE_TTL = 120
_cache: dict = {k: {"at": 0.0, "items": []} for k in FEEDS}

TAG_RULES = [
    ("Регулирование", r"регулир|закон|\bsec\b|\bсуд|налог|минфин|\bцб\b|центробанк|банк росси|санкц|запрет|лицензи[яю]|госдум|прокурат|\bfca\b|\bmica\b|арест|штраф"),
    ("DeFi", r"defi|дефи|стейкинг|\blido\b|uniswap|aave|\bdex\b|токенизац|\brwa\b|стейблкоин|ликвидн[а-я]* пул"),
    ("Аналитика", r"аналит|прогноз|сценари|мнение|эксперт|исследован|опрос|индекс страха|on-chain|ончейн"),
    ("Рынок", r"курс|цен[аыу]|подорож|подешев|рост|упал|вырос|рекорд|ралли|ликвидац|etf|фонд|приток|отток|биржа|торг|капитализац|выручк|инвест"),
    ("Технологии", r"обновлен|хардфорк|блокчейн|разработ|\bии\b|ии-|искусствен|\bl2\b|апгрейд|кошел|смарт-контракт|взлом|хакер|уязвим|квантов|майнинг|протокол"),
]

COINS = [
    ("BTC", r"биткоин|bitcoin|\bbtc\b"),
    ("ETH", r"эфир|ethereum|\beth\b|бутерин"),
    ("SOL", r"солан|solana|\bsol\b"),
    ("TON", r"\bton\b|тонкоин|toncoin|telegram open"),
    ("XRP", r"\bxrp\b|ripple|рипл"),
    ("BNB", r"\bbnb\b|binance|бинанс"),
    ("DOGE", r"doge|догикоин|dogecoin"),
    ("ADA", r"cardano|кардано|\bada\b"),
    ("USDT", r"usdt|tether|тезер"),
    ("USDC", r"usdc|circle"),
    ("BRENT", OIL_RX),
    ("GOLD", GOLD_RX),
]


def classify_commodity(title: str) -> str:
    t = title.lower()
    if re.search(OIL_RX, t):
        return "Нефть"
    if re.search(GOLD_RX, t):
        return "Золото"
    return ""


def clean(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def first_image(raw: str) -> str:
    m = re.search(r'<img[^>]+src="([^"]+)"', raw or "")
    return m.group(1) if m else ""


WORLD_RULES = [
    ("Экономика", r"экономик|бизнес|финанс|нефт|газ|рынок|бирж|ставк|инфляц|ввп|бюджет|рубл|доллар|санкц|торгов|пошлин"),
    ("Политика", r"политик|президент|выбор|парламент|министр|правительств|дипломат|переговор|саммит|оон|нато|госдеп|кремл"),
    ("Происшествия", r"происшеств|авари|катастроф|пожар|взрыв|землетряс|наводнен|погиб|крушен|ураган|теракт"),
    ("Технологии", r"технолог|наука|космос|\bии\b|искусствен|смартфон|интернет|медиа"),
    ("Общество", r"обществ|культур|спорт|здоровь|образован|мигра"),
]


def classify_world(title: str, cats: list) -> str:
    hay = f"{' '.join(cats)} {title}".lower()
    for tag, rx in WORLD_RULES:
        if re.search(rx, hay):
            return tag
    return "В мире"


def classify(title: str, text: str, cats: list) -> str:
    for hay in (f"{title} {' '.join(cats)}".lower(), text[:400].lower()):
        for tag, rx in TAG_RULES:
            if re.search(rx, hay):
                return tag
    return "Рынок"


def detect_coins(title: str, text: str) -> list:
    hay = f"{title} {text}".lower()
    return [c for c, rx in COINS if re.search(rx, hay)][:4]


def fetch_feed(source: str, url: str, kind: str = "crypto") -> list:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (TraderkaNewsBot)"})
    with urllib.request.urlopen(req, timeout=3.5) as r:
        root = ET.fromstring(r.read())
    items = []
    for it in root.iter("item"):
        title = clean(it.findtext("title", ""))
        link = (it.findtext("link", "") or "").strip()
        raw = it.findtext("description", "") or ""
        text = clean(raw)
        if not title or not link:
            continue
        cats = [clean(c.text or "") for c in it.findall("category")]
        commodity = ""
        if kind == "crypto" and source in COMMODITY_SOURCES:
            commodity = classify_commodity(title)
            if not commodity:
                continue
        try:
            ts = int(parsedate_to_datetime(it.findtext("pubDate", "")).timestamp() * 1000)
        except (TypeError, ValueError):
            ts = int(time.time() * 1000)
        media = it.find("media:content", NS)
        enclosure = it.find("enclosure")
        image = (
            (media.get("url") if media is not None else "")
            or (enclosure.get("url") if enclosure is not None else "")
            or first_image(raw)
        )
        author = clean(it.findtext("dc:creator", "", NS)) or source
        items.append({
            "id": hashlib.md5(link.encode()).hexdigest()[:12],
            "title": title,
            "text": text[:1200],
            "link": link,
            "image": image,
            "source": source,
            "author": author,
            "ts": ts,
            "tag": commodity or (classify(title, text, cats) if kind == "crypto" else classify_world(title, cats)),
            "coins": (["BRENT"] if commodity == "Нефть" else ["GOLD"]) if commodity else (detect_coins(title, text) if kind == "crypto" else []),
        })
    return items


def load_all(kind: str) -> tuple:
    errors = []
    items = []
    feeds = FEEDS[kind]
    with ThreadPoolExecutor(max_workers=len(feeds)) as ex:
        futures = {ex.submit(fetch_feed, s, u, kind): s for s, u in feeds}
        per_source: dict = {}
        for f, s in futures.items():
            try:
                got = f.result()
                if kind == "crypto" and s in COMMODITY_SOURCES:
                    room = 12 - per_source.get(s, 0)
                    got = got[:max(room, 0)]
                    per_source[s] = per_source.get(s, 0) + len(got)
                items.extend(got if kind == "crypto" else got[:25])
            except Exception as e:  # noqa: BLE001
                errors.append(f"{s}: {type(e).__name__}")
    seen = set()
    uniq = []
    for it in sorted(items, key=lambda x: x["ts"], reverse=True):
        key = re.sub(r"\W+", "", it["title"].lower())[:60]
        if key in seen:
            continue
        seen.add(key)
        uniq.append(it)
    if kind == "crypto":
        crypto = [i for i in uniq if i["tag"] not in ("Нефть", "Золото")][:50]
        comm = [i for i in uniq if i["tag"] in ("Нефть", "Золото")][:20]
        return sorted(crypto + comm, key=lambda x: x["ts"], reverse=True), errors
    return uniq[:60], errors


COMMODITIES = {
    "brent": {"ticker": "BZ=F", "symbol": "brent", "name": "BRENT"},
    "gold": {"ticker": "GC=F", "symbol": "xau", "name": "Gold"},
    "usdt-rub": {"ticker": "USDT-RUB", "symbol": "usdt", "name": "USDT/RUB", "quote": "RUB"},
}
QUOTE_TTL = 300
_quotes: dict = {"at": 0.0, "data": None}
_charts: dict = {}
RANGES = {1: ("1d", "5m"), 7: ("7d", "1h"), 30: ("1mo", "1h"), 90: ("3mo", "1d"), 365: ("1y", "1d")}


YAHOO_HOSTS = ("query1.finance.yahoo.com", "query2.finance.yahoo.com")


def yahoo_one(host: str, ticker: str, rng: str, interval: str) -> dict:
    req = urllib.request.Request(
        f"https://{host}/v8/finance/chart/{ticker}?range={rng}&interval={interval}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=2.5) as r:
        return json.loads(r.read())["chart"]["result"][0]


def yahoo(ticker: str, rng: str, interval: str) -> dict:
    """Запрашиваем оба адреса Yahoo одновременно и берём первый удачный ответ."""
    ex = ThreadPoolExecutor(max_workers=len(YAHOO_HOSTS))
    futures = [ex.submit(yahoo_one, h, ticker, rng, interval) for h in YAHOO_HOSTS]
    last = None
    try:
        for f in as_completed(futures):
            try:
                return f.result()
            except Exception as e:
                last = e
    finally:
        ex.shutdown(wait=False)
    raise last or RuntimeError("yahoo недоступен")


OKX_GOLD = "XAUT-USDT"
PERP_BAR = {1: ("5m", "5", 288), 7: ("1h", "60", 168), 30: ("4h", "240", 180), 90: ("1d", "D", 90), 365: ("1d", "D", 300)}


def get_any(urls: list):
    last = None
    for u in urls:
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=2) as r:
                return u, json.loads(r.read())
        except Exception as e:
            last = e
    raise last or RuntimeError("нет источников")


def perp_points(sym: str, days: int) -> list:
    """Свечи бессрочного контракта на нефть: Binance, а если недоступен, Bybit."""
    bn, bb, limit = PERP_BAR[days]
    u, d = get_any([
        f"https://fapi.binance.com/fapi/v1/klines?symbol={sym}&interval={bn}&limit={limit}",
        f"https://api.bybit.com/v5/market/kline?category=linear&symbol={sym}&interval={bb}&limit={limit}",
    ])
    if "bybit" in u:
        rows = [(int(r[0]), float(r[4])) for r in d["result"]["list"]]
    else:
        rows = [(int(r[0]), float(r[4])) for r in d]
    return sorted(rows)


def load_usdt_rub() -> dict:
    """Запасной источник курса USDT/RUB: спотовая пара на Binance."""
    with ThreadPoolExecutor(max_workers=2) as ex:
        fd = ex.submit(get_any, ["https://data-api.binance.vision/api/v3/ticker/24hr?symbol=USDTRUB"])
        fk = ex.submit(get_any, ["https://data-api.binance.vision/api/v3/klines?symbol=USDTRUB&interval=1h&limit=168"])
        d, k = fd.result()[1], fk.result()[1]
    price = float(d["lastPrice"])
    pts = [(int(r[0]), float(r[4])) for r in k]
    first = pts[0][1] if pts else price
    c = COMMODITIES["usdt-rub"]
    return {
        "id": "usdt-rub", "symbol": c["symbol"], "name": c["name"], "image": "", "kind": "commodity", "quote": "RUB",
        "current_price": price, "market_cap": 0, "total_volume": float(d.get("quoteVolume") or 0),
        "high_24h": float(d["highPrice"]), "low_24h": float(d["lowPrice"]),
        "price_change_percentage_24h": round(float(d["priceChangePercent"]), 2),
        "price_change_percentage_1h_in_currency": round((price - pts[-2][1]) / pts[-2][1] * 100, 2) if len(pts) > 1 else 0,
        "price_change_percentage_7d_in_currency": round((price - first) / first * 100, 2) if first else 0,
        "sparkline_in_7d": {"price": [p for _, p in pts]},
    }


def load_brent_perp() -> dict:
    """Запасной источник нефти: бессрочный контракт BZUSDT."""
    with ThreadPoolExecutor(max_workers=2) as ex:
        ftk = ex.submit(get_any, [
            "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BZUSDT",
            "https://api.bybit.com/v5/market/tickers?category=linear&symbol=BZUSDT",
        ])
        fpt = ex.submit(perp_points, "BZUSDT", 7)
        (u, d), pts = ftk.result(), fpt.result()
    if "bybit" in u:
        t = d["result"]["list"][0]
        price, high, low = float(t["lastPrice"]), float(t["highPrice24h"]), float(t["lowPrice24h"])
        pct, vol = float(t["price24hPcnt"]) * 100, float(t.get("turnover24h") or 0)
    else:
        price, high, low = float(d["lastPrice"]), float(d["highPrice"]), float(d["lowPrice"])
        pct, vol = float(d["priceChangePercent"]), float(d.get("quoteVolume") or 0)
    first = pts[0][1] if pts else price
    c = COMMODITIES["brent"]
    return {
        "id": "brent", "symbol": c["symbol"], "name": c["name"], "image": "", "kind": "commodity", "quote": "USD",
        "current_price": price, "market_cap": 0, "total_volume": vol, "high_24h": high, "low_24h": low,
        "price_change_percentage_24h": round(pct, 2),
        "price_change_percentage_1h_in_currency": round((price - pts[-2][1]) / pts[-2][1] * 100, 2) if len(pts) > 1 else 0,
        "price_change_percentage_7d_in_currency": round((price - first) / first * 100, 2) if first else 0,
        "sparkline_in_7d": {"price": [p for _, p in pts]},
    }


def okx_json(path: str) -> list:
    req = urllib.request.Request(f"https://www.okx.com/api/v5/market/{path}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=2) as r:
        d = json.loads(r.read())
    if d.get("code") != "0" or not d.get("data"):
        raise ValueError("okx: пустой ответ")
    return d["data"]


def okx_gold_points(days: int) -> list:
    bar, limit = {1: ("5m", 288), 7: ("1H", 168), 30: ("4H", 180), 90: ("1D", 90), 365: ("1D", 300)}[days]
    rows = okx_json(f"candles?instId={OKX_GOLD}&bar={bar}&limit={limit}")
    return sorted((int(r[0]), float(r[4])) for r in rows)


def load_gold_okx() -> dict:
    """Запасной источник золота: токен XAUT, привязанный к цене унции."""
    with ThreadPoolExecutor(max_workers=2) as ex:
        ft = ex.submit(okx_json, f"ticker?instId={OKX_GOLD}")
        fp = ex.submit(okx_gold_points, 7)
        t, pts = ft.result()[0], fp.result()
    price = float(t["last"])
    opened = float(t["open24h"]) if t.get("open24h") else price
    first = pts[0][1] if pts else price
    c = COMMODITIES["gold"]
    return {
        "id": "gold", "symbol": c["symbol"], "name": c["name"], "image": "", "kind": "commodity", "quote": "USD",
        "current_price": price, "market_cap": 0, "total_volume": float(t.get("volCcy24h") or 0),
        "high_24h": float(t.get("high24h") or price), "low_24h": float(t.get("low24h") or price),
        "price_change_percentage_24h": round((price / opened - 1) * 100, 2) if opened else 0,
        "price_change_percentage_1h_in_currency": round((price - pts[-2][1]) / pts[-2][1] * 100, 2) if len(pts) > 1 else 0,
        "price_change_percentage_7d_in_currency": round((price - first) / first * 100, 2) if first else 0,
        "sparkline_in_7d": {"price": [p for _, p in pts]},
    }


def series(res: dict) -> list:
    ts = res.get("timestamp") or []
    closes = res["indicators"]["quote"][0].get("close") or []
    return [(t * 1000, c) for t, c in zip(ts, closes) if c is not None]


def load_commodity(cid: str) -> dict:
    c = COMMODITIES[cid]
    res = yahoo(c["ticker"], "7d", "1h")
    meta = res["meta"]
    pts = series(res)
    price = float(meta["regularMarketPrice"])
    pct = meta.get("regularMarketChangePercent")
    if pct is None:
        prev = float(meta.get("previousClose") or meta.get("chartPreviousClose") or price)
        pct = (price - prev) / prev * 100 if prev else 0
    first = pts[0][1] if pts else price
    last_day = [p for t, p in pts if t >= (pts[-1][0] - 86400000)] if pts else [price]
    return {
        "id": cid,
        "symbol": c["symbol"],
        "name": c["name"],
        "image": "",
        "kind": "commodity",
        "quote": c.get("quote", "USD"),
        "current_price": price,
        "market_cap": 0,
        "total_volume": float(meta.get("regularMarketVolume") or 0),
        "high_24h": float(meta.get("regularMarketDayHigh") or max(last_day)),
        "low_24h": float(meta.get("regularMarketDayLow") or min(last_day)),
        "price_change_percentage_24h": round(float(pct), 2),
        "price_change_percentage_1h_in_currency": round((price - pts[-2][1]) / pts[-2][1] * 100, 2) if len(pts) > 1 else 0,
        "price_change_percentage_7d_in_currency": round((price - first) / first * 100, 2) if first else 0,
        "sparkline_in_7d": {"price": [p for _, p in pts]},
    }


def json_resp(status: int, body, cache: int = 120) -> dict:
    return {
        "statusCode": status,
        "headers": {**CORS, "Content-Type": "application/json", "Cache-Control": f"public, max-age={cache}"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def load_safe(cid: str):
    """Основной (Yahoo) и запасной источники опрашиваются одновременно: берём основной, а если он молчит, запасной."""
    fallback = {"gold": load_gold_okx, "brent": load_brent_perp, "usdt-rub": load_usdt_rub}.get(cid)
    ex = ThreadPoolExecutor(max_workers=2)
    try:
        fp = ex.submit(load_commodity, cid)
        ff = ex.submit(fallback) if fallback else None
        try:
            return fp.result()
        except Exception as e:
            print("основной источник не ответил:", cid, type(e).__name__, e)
        if ff:
            try:
                return ff.result()
            except Exception as e:
                print("запасной источник не ответил:", cid, type(e).__name__, e)
    finally:
        ex.shutdown(wait=False)
    return None


def commodities_response() -> dict:
    now = time.time()
    if not _quotes["data"] or now - _quotes["at"] > QUOTE_TTL:
        with ThreadPoolExecutor(max_workers=len(COMMODITIES)) as ex:
            fresh = list(ex.map(load_safe, COMMODITIES.keys()))
        old = {i["id"]: i for i in (_quotes["data"] or [])}
        merged = []
        for cid, item in zip(COMMODITIES.keys(), fresh):
            if item:
                merged.append(item)
            elif cid in old:
                merged.append(old[cid])
        if merged:
            _quotes.update(at=now if any(fresh) else _quotes["at"], data=merged)
            if not any(fresh):
                _quotes["at"] = now - QUOTE_TTL + 20
    if not _quotes["data"]:
        return json_resp(502, {"error": "Котировки сырья и валют временно недоступны"})
    return json_resp(200, {"items": _quotes["data"], "updatedAt": int(_quotes["at"] * 1000)})


def brent_response() -> dict:
    r = commodities_response()
    if r["statusCode"] != 200:
        return r
    b = next(x for x in _quotes["data"] if x["id"] == "brent")
    return json_resp(200, {"price": b["current_price"], "change": b["price_change_percentage_24h"], "updatedAt": int(_quotes["at"] * 1000)})


def chart_response(qs: dict) -> dict:
    cid = str(qs.get("id", ""))
    days = int(qs.get("days", "7")) if str(qs.get("days", "7")).isdigit() else 7
    if cid not in COMMODITIES:
        return json_resp(400, {"error": "Неизвестный инструмент"})
    days = min(RANGES.keys(), key=lambda d: abs(d - days))
    key = f"{cid}:{days}"
    now = time.time()
    cached = _charts.get(key)
    if not cached or now - cached[0] > QUOTE_TTL:
        try:
            rng, interval = RANGES[days]
            _charts[key] = (now, series(yahoo(COMMODITIES[cid]["ticker"], rng, interval)))
        except Exception as e:
            print("chart error:", type(e).__name__, e)
            if cid == "gold":
                try:
                    _charts[key] = (now, okx_gold_points(days))
                except Exception as e2:
                    print("gold chart okx error:", type(e2).__name__, e2)
            if cid == "usdt-rub" and key not in _charts:
                try:
                    _, k = get_any([f"https://data-api.binance.vision/api/v3/klines?symbol=USDTRUB&interval={PERP_BAR[days][0]}&limit={PERP_BAR[days][2]}"])
                    _charts[key] = (now, sorted((int(r[0]), float(r[4])) for r in k))
                except Exception as e2:
                    print("usdt-rub chart error:", type(e2).__name__, e2)
            if cid == "brent" and key not in _charts:
                try:
                    _charts[key] = (now, perp_points("BZUSDT", days))
                except Exception as e2:
                    print("brent chart error:", type(e2).__name__, e2)
            if key not in _charts:
                return json_resp(502, {"error": "График временно недоступен"})
    return json_resp(200, {"prices": [[t, p] for t, p in _charts[key][1]]})


def handler(event: dict, context) -> dict:
    """Новости (?kind=crypto|world) из RSS, котировки нефти Brent, золота, USD/RUB и EUR/RUB (?resource=commodities) и их графики (?resource=chart&id=&days=), тепловая карта ликвидаций (?resource=heatmap&symbol=&range=), топ монет по числу сделок (?resource=toptxs), BTC в казначействах компаний и индекс альтсезона (?resource=cmc), экономический календарь важных событий (?resource=calendar), притоки и оттоки активов на биржах (?resource=exflows), котировки 18 монет (?resource=markets) и их графики (?resource=coinchart&id=&days=)"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}
    qs = event.get("queryStringParameters") or {}
    resource = qs.get("resource")
    if resource == "markets":
        return markets_response(json_resp)
    if resource == "coinchart":
        return coinchart_response(qs, json_resp)
    if resource == "brent":
        return brent_response()
    if resource == "commodities":
        return commodities_response()
    if resource == "chart":
        return chart_response(qs)
    if resource == "exflows":
        return exchange_flows_response(json_resp)
    if resource == "heatmap":
        return heatmap_response(qs, json_resp)
    if resource == "liqmap":
        return liqmap_response(qs, json_resp)
    if resource == "toptxs":
        return toptxs_response(json_resp)
    if resource == "liqhist":
        return liq_history_response(qs, json_resp)
    if resource == "cmc":
        return cmc_response(json_resp)
    if resource == "calendar":
        return calendar_response(json_resp)

    kind = qs.get("kind") if qs.get("kind") in FEEDS else "crypto"
    cache = _cache[kind]
    now = time.time()
    cached = False
    errors: list = []
    if cache["items"] and now - cache["at"] < CACHE_TTL:
        items = cache["items"]
        cached = True
    else:
        items, errors = load_all(kind)
        if items:
            cache.update(at=now, items=items)
        elif cache["items"]:
            items = cache["items"]
            cached = True

    status = 200 if items else 502
    body = {"items": items, "updatedAt": int(cache["at"] * 1000) or int(now * 1000), "cached": cached}
    if not items:
        body["error"] = "Источники новостей временно недоступны"
    if errors:
        print("feed errors:", errors)
    return {
        "statusCode": status,
        "headers": {**CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=60"},
        "body": json.dumps(body, ensure_ascii=False),
    }