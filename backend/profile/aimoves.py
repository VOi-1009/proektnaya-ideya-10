import time

from aiprices import fmt_change, fmt_price, prices

SCHEMA_CHECK = {"at": 0.0}
CHECK_EVERY = 300
WATCH = [
    ("bitcoin", "Bitcoin", "bitcoin|биткоин|btc"),
    ("ethereum", "Ethereum", "ethereum|эфир|eth"),
    ("solana", "Solana", "solana|солан"),
    ("toncoin", "Toncoin", "toncoin|тонкоин"),
    ("xrp", "XRP", "xrp|рипл"),
    ("bnb", "BNB", "bnb"),
    ("dogecoin", "Dogecoin", "dogecoin|доге"),
    ("brent", "Нефть Brent", "brent|нефт"),
    ("gold", "Золото", "золот|gold"),
]
UP = ["резко выросл{e}", "уверенно идёт вверх", "прибавил{e} за сутки"]
TIPS_UP = [
    "Рост на таких объёмах часто сопровождается откатом — смотрите на график в #котировки.",
    "Участники рынка явно оживились. Обсудить можно в «Чате зелёных».",
    "Резкие движения увеличивают риск, не гонитесь за ценой.",
]
TIPS_DOWN = [
    "Резкое падение часто сменяется отскоком, но ловить «падающий нож» рискованно.",
    "Рынок нервничает. Обсудить можно в «Чате красных».",
    "Проверьте новости: у таких движений обычно есть причина.",
]


def msk_day() -> str:
    t = time.gmtime(time.time() + 3 * 3600)
    return f"{t.tm_year:04d}{t.tm_mon:02d}{t.tm_mday:02d}"


def esc(v: str) -> str:
    return v.replace("'", "''")


def verb(name: str, up: bool, seed: int) -> str:
    fem = name == "Нефть Brent"
    neut = name == "Золото"
    suffix = "а" if fem else "о" if neut else ""
    if up:
        return ["резко выросла" if fem else "резко выросло" if neut else "резко вырос", "уверенно растёт", "прибавила за сутки" if fem else "прибавило за сутки" if neut else "прибавил за сутки"][seed % 3]
    return ["резко упала" if fem else "резко упало" if neut else "резко упал", "заметно снижается", "потеряла за сутки" if fem else "потеряло за сутки" if neut else "потерял за сутки"][seed % 3]


def related_news(cur, schema: str, pattern: str):
    like = " OR ".join(f"LOWER(title) LIKE '%{w}%'" for w in pattern.split("|"))
    cur.execute(
        f"SELECT title, link, source FROM {schema}.news_items WHERE ({like}) "
        f"AND COALESCE(published_ms, (EXTRACT(EPOCH FROM created_at) * 1000)::bigint) > {int((time.time() - 86400) * 1000)} "
        f"ORDER BY COALESCE(published_ms, 0) DESC LIMIT 1"
    )
    return cur.fetchone()


def check_moves(cur, schema: str, threshold: float, force: bool = False) -> int:
    now = time.time()
    if not force and now - SCHEMA_CHECK["at"] < CHECK_EVERY:
        return 0
    SCHEMA_CHECK["at"] = now
    p = prices()
    day = msk_day()
    created = 0
    for key, name, pattern in WATCH:
        v = p.get(key)
        if not v:
            continue
        ch = float(v["change"])
        if abs(ch) < threshold:
            continue
        up = ch > 0
        step = int(abs(ch) // threshold)
        move_key = f"{key}:{'up' if up else 'down'}:{day}:{step}"
        title = f"{name}: {fmt_change(ch)} за сутки"
        seed = int(now // 3600) + len(key)
        lines = [f"{name} {verb(name, up, seed)} — {fmt_change(ch)}. Сейчас около {fmt_price(key, v['price'])}."]
        links = []
        news = related_news(cur, schema, pattern)
        if news:
            lines.append(f"Что пишут: {news[0]}" + (f" ({news[2]})" if news[2] else ""))
            if str(news[1]).startswith("http"):
                links.append({"title": news[0], "url": news[1]})
        tips = TIPS_UP if up else TIPS_DOWN
        lines.append(tips[seed % len(tips)])
        import json
        cur.execute(
            f"INSERT INTO {schema}.ai_posts (title, body, links, kind, move_key) VALUES ('{esc(title)}', '{esc(chr(10).join(lines))}', "
            f"'{esc(json.dumps(links, ensure_ascii=False))}', 'move', '{esc(move_key)}') ON CONFLICT DO NOTHING"
        )
        created += cur.rowcount or 0
    return created
