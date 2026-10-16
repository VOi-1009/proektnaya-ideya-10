import hashlib
import html
import json
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from email.utils import parsedate_to_datetime

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}

FEEDS = [
    ("ForkLog", "https://forklog.com/feed"),
    ("Bits.media", "https://bits.media/rss2/"),
]

NS = {"dc": "http://purl.org/dc/elements/1.1/", "media": "http://search.yahoo.com/mrss/"}

CACHE_TTL = 120
_cache: dict = {"at": 0.0, "items": []}

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
]


def clean(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def first_image(raw: str) -> str:
    m = re.search(r'<img[^>]+src="([^"]+)"', raw or "")
    return m.group(1) if m else ""


def classify(title: str, text: str, cats: list) -> str:
    for hay in (f"{title} {' '.join(cats)}".lower(), text[:400].lower()):
        for tag, rx in TAG_RULES:
            if re.search(rx, hay):
                return tag
    return "Рынок"


def detect_coins(title: str, text: str) -> list:
    hay = f"{title} {text}".lower()
    return [c for c, rx in COINS if re.search(rx, hay)][:4]


def fetch_feed(source: str, url: str) -> list:
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
            "tag": classify(title, text, cats),
            "coins": detect_coins(title, text),
        })
    return items


def load_all() -> tuple:
    errors = []
    items = []
    with ThreadPoolExecutor(max_workers=len(FEEDS)) as ex:
        futures = {ex.submit(fetch_feed, s, u): s for s, u in FEEDS}
        for f, s in futures.items():
            try:
                items.extend(f.result())
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
    return uniq[:60], errors


def handler(event: dict, context) -> dict:
    """Лента криптоновостей из открытых RSS-источников (ForkLog, Bits.media) с темами и упомянутыми монетами"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    now = time.time()
    cached = False
    errors: list = []
    if _cache["items"] and now - _cache["at"] < CACHE_TTL:
        items = _cache["items"]
        cached = True
    else:
        items, errors = load_all()
        if items:
            _cache.update(at=now, items=items)
        elif _cache["items"]:
            items = _cache["items"]
            cached = True

    status = 200 if items else 502
    body = {"items": items, "updatedAt": int(_cache["at"] * 1000) or int(now * 1000), "cached": cached}
    if not items:
        body["error"] = "Источники новостей временно недоступны"
    if errors:
        print("feed errors:", errors)
    return {
        "statusCode": status,
        "headers": {**CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=60"},
        "body": json.dumps(body, ensure_ascii=False),
    }