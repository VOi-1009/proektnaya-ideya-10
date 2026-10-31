import json
import os
import time
import uuid

import boto3

from aiprices import fmt_change, fmt_price, prices
from movecard import render_move_card

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
    ("hyperliquid", "Hyperliquid", "hyperliquid|hype"),
    ("zcash", "Zcash", "zcash|zec"),
    ("brent", "Нефть Brent", "brent|нефт"),
    ("gold", "Золото", "золот|gold"),
]
LOOK = {
    "bitcoin": ("BTC", "#F7931A"), "ethereum": ("ETH", "#627EEA"), "solana": ("SOL", "#9945FF"), "toncoin": ("TON", "#0098EA"),
    "xrp": ("XRP", "#23292F"), "bnb": ("BNB", "#F3BA2F"), "dogecoin": ("DOGE", "#C2A633"), "hyperliquid": ("HYPE", "#50D2C1"),
    "zcash": ("ZEC", "#F4B728"), "brent": ("OIL", "#4B5563"), "gold": ("GOLD", "#D4A017"),
}
AI_EMAIL = "aitraderka@bots.traderka.ru"
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


def upload_card(data: bytes) -> str:
    key = f"community/moves/{uuid.uuid4().hex}.png"
    s3 = boto3.client(
        "s3", endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"], aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType="image/png")
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def check_moves(cur, schema: str, threshold: float, force: bool = False) -> int:
    now = time.time()
    if not force and now - SCHEMA_CHECK["at"] < CHECK_EVERY:
        return 0
    SCHEMA_CHECK["at"] = now
    cur.execute(f"SELECT id FROM {schema}.users WHERE email = '{AI_EMAIL}'")
    ai = cur.fetchone()
    if not ai:
        return 0
    ai_id = int(ai[0])
    p = prices()
    t = time.gmtime(now + 3 * 3600)
    day = msk_day()
    date_text = f"{t.tm_mday:02d}.{t.tm_mon:02d}.{t.tm_year}"
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
        cur.execute(
            f"SELECT 1 FROM {schema}.community_posts WHERE move_key = '{esc(move_key)}' "
            f"UNION ALL SELECT 1 FROM {schema}.ai_posts WHERE move_key = '{esc(move_key)}' LIMIT 1"
        )
        if cur.fetchone():
            continue
        seed = int(now // 3600) + len(key)
        lines = [f"{name} {verb(name, up, seed)} — {fmt_change(ch)}. Сейчас около {fmt_price(key, v['price'])}."]
        news = related_news(cur, schema, pattern)
        if news:
            lines.append(f"Что пишут: {news[0]}" + (f" ({news[2]})" if news[2] else ""))
        tips = TIPS_UP if up else TIPS_DOWN
        lines.append(tips[seed % len(tips)])
        short, color = LOOK.get(key, (key[:4].upper(), "#F97316"))
        change_text = fmt_change(ch).replace("-", "\u2212")
        try:
            image = upload_card(render_move_card(name, short, color, change_text, fmt_price(key, v["price"]), up, date_text))
        except Exception as e:
            print("move card error:", e)
            image = ""
        cur.execute(
            f"INSERT INTO {schema}.community_posts (user_id, body, image_url, sentiment, coins, move_key) VALUES "
            f"({ai_id}, '{esc(chr(10).join(lines))}', '{esc(image)}', '{'bull' if up else 'bear'}', '{key}', '{esc(move_key)}') ON CONFLICT DO NOTHING"
        )
        created += cur.rowcount or 0
    return created
