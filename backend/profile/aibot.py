import json
import os
import re
import time

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
AI_EMAIL = "aitraderka@bots.traderka.ru"
DEFAULTS = {
    "enabled": True, "moderation": True, "blockLinks": True, "blockCaps": True, "stopWords": "",
    "reactShare": 90, "likeShare": 70, "autoNews": True, "newsHours": 6,
    "chatReplies": True, "replyAll": True, "dailyPrices": True,
}
PFX = r"(?:на|по|за|от|вы|до|у|при|рас|раз|об|о|с|недо|пере|под|про|въ|из|ни)?"
BAD_RE = re.compile(
    r"(?<![а-я])" + PFX + r"(?:"
    r"х[у\*]+[йеяюи]|хуе|пизд|п[и\*]+зд|[её]б[аулн]|[её]би[тсн]|[её]бет|[её]бт|бля(?!х)[дт]?|сук[аиу]?(?![а-я])|мудак|мудил|пид[оа]р|гандон|залуп|шлюх|"
    r"долб[ао][её]б|у[её]б[ако]|мраз[ьи]"
    r")"
)
SAFE_WORDS = {"ебеня", "ебенях", "сукно", "сукна", "уеба"}
SPAM_RE = re.compile(
    r"(заработ\w* без вложени|заработай|пассивн\w* доход\w* (от|с) нас|пиш\w* в (лс|личк)|подписыва\w* на (канал|меня)|"
    r"переход\w* по ссылк|жми на ссылк|казино|ставк\w* на спорт|бонус за регистрац|раздач\w* (крипт|usdt|токен)|"
    r"гарантированн\w* (доход|прибыл)|сигнал\w* в (тг|телеграм)|вступа\w* в (канал|групп|чат)|продам аккаунт|"
    r"рекламн\w* (услуг|размещ)|(доход|прибыл\w*) от \d+ ?(\$|руб|р\.|usdt) в (день|сутки|час))",
    re.I,
)
LINK_RE = re.compile(r"(https?://|www\.|t\.me/|@\w{4,}bot\b|\b[\w-]+\.(ru|com|io|net|org|me|xyz|top|site|online|cc|pro)\b)", re.I)


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def load_settings(cur) -> dict:
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'ai_bot'")
    r = cur.fetchone()
    return {**DEFAULTS, **(json.loads(r[0]) if r else {})}


def ai_bot_id(cur):
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE is_ai LIMIT 1")
    r = cur.fetchone()
    return int(r[0]) if r else None


def norm(text: str) -> str:
    t = text.lower().replace("ё", "е")
    return t.translate(str.maketrans({"a": "а", "e": "е", "o": "о", "p": "р", "c": "с", "x": "х", "y": "у", "k": "к", "@": "а", "0": "о", "3": "з", "6": "б", "s": "с", "u": "и", "b": "в", "m": "м", "h": "н", "t": "т"}))


def has_bad(text: str) -> bool:
    for w in re.findall(r"[а-яa-z\*@0-9]+", norm(text)):
        if w in SAFE_WORDS:
            continue
        if BAD_RE.match(w) and not w.startswith(("страх", "хуан", "хуто", "хулиг", "ебнет")):
            return True
    return False


def moderate(text: str, s: dict):
    if not (s.get("enabled") and s.get("moderation")):
        return None
    low = text.lower().replace("ё", "е")
    extra = [w.strip().lower().replace("ё", "е") for w in re.split(r"[,\n]", s.get("stopWords", "")) if w.strip()]
    if has_bad(text):
        return "нецензурная лексика"
    if any(w in low for w in extra):
        return "запрещённое слово"
    if SPAM_RE.search(low):
        return "реклама или спам"
    if s.get("blockLinks") and LINK_RE.search(text):
        return "ссылки и реклама запрещены"
    letters = [c for c in text if c.isalpha()]
    if s.get("blockCaps") and len(letters) >= 15 and sum(c.isupper() for c in letters) / len(letters) > 0.8:
        return "сообщение написано капсом"
    if re.search(r"(.)\1{9,}", text) or re.search(r"(\S{2,8})\1{5,}", text):
        return "флуд"
    return None


def log_block(cur, uid: int, room: str, text: str, reason: str) -> None:
    cur.execute(
        f"INSERT INTO {SCHEMA}.ai_moderation_log (user_id, room, text, reason) VALUES ({int(uid)}, '{esc(room)}', '{esc(text[:1000])}', '{esc(reason)}')"
    )


def make_digest(cur, kind: str = "auto"):
    cur.execute(
        f"SELECT n.title, n.link, n.source, n.kind, COUNT(*) FILTER (WHERE r.value = 1), COUNT(*) FILTER (WHERE r.value = -1) "
        f"FROM {SCHEMA}.news_reactions r JOIN {SCHEMA}.news_items n ON n.id = r.news_id "
        f"WHERE r.created_at > NOW() - INTERVAL '24 hours' "
        f"GROUP BY n.id, n.title, n.link, n.source, n.kind ORDER BY COUNT(*) DESC LIMIT 5"
    )
    rows = cur.fetchall()
    if not rows:
        return None
    likes = sum(int(r[4]) for r in rows)
    dislikes = sum(int(r[5]) for r in rows)
    mood = "позитивное" if likes >= dislikes * 2 else "сдержанное" if likes >= dislikes else "тревожное"
    hour = (time.gmtime().tm_hour + 3) % 24
    part = "Утренний" if 5 <= hour < 12 else "Дневной" if hour < 18 else "Вечерний"
    title = f"{part} дайджест: главное за сутки"
    lines = [f"Разобрал реакции участников на новости за последние 24 часа. Настроение сообщества — {mood}."]
    for i, r in enumerate(rows, 1):
        tag = "крипта" if r[3] == "crypto" else "мир"
        lines.append(f"{i}. {r[0]} ({r[2] or tag}) — 👍 {int(r[4])} / 👎 {int(r[5])}")
    lines.append("Обсудить можно в «Чате зелёных» и «Чате красных».")
    links = [{"title": r[0], "url": r[1]} for r in rows]
    cur.execute(
        f"INSERT INTO {SCHEMA}.ai_posts (title, body, links, kind) VALUES ('{esc(title)}', '{esc(chr(10).join(lines))}', "
        f"'{esc(json.dumps(links, ensure_ascii=False))}', '{kind}') RETURNING id"
    )
    return cur.fetchone()[0]


def maybe_autopost(cur, s: dict) -> None:
    if not (s.get("enabled") and s.get("autoNews")):
        return
    hours = max(1, min(int(s.get("newsHours") or 6), 48))
    cur.execute(f"SELECT 1 FROM {SCHEMA}.ai_posts WHERE kind = 'auto' AND created_at > NOW() - INTERVAL '{hours} hours' LIMIT 1")
    if not cur.fetchone():
        make_digest(cur)


def maybe_daily(cur, s: dict) -> None:
    if not (s.get("enabled") and s.get("dailyPrices", True)):
        return
    from aichat import daily_body, date_title, msk
    t = msk()
    if t.tm_hour == 0 and t.tm_min < 5:
        return
    day = f"{t.tm_year:04d}-{t.tm_mon:02d}-{t.tm_mday:02d}"
    cur.execute(f"SELECT 1 FROM {SCHEMA}.ai_posts WHERE kind = 'daily' AND post_date = '{day}'")
    if cur.fetchone():
        return
    title = f"Сводка рынка на {date_title(t)}"
    cur.execute(
        f"INSERT INTO {SCHEMA}.ai_posts (title, body, kind, post_date, created_at) VALUES ('{esc(title)}', '{esc(daily_body())}', 'daily', '{day}', "
        f"('{day} 00:05:00'::timestamp - INTERVAL '3 hours')) ON CONFLICT DO NOTHING"
    )


def bot_reply(cur, s: dict, room: str, text: str, user_name: str) -> None:
    if not (s.get("enabled") and s.get("chatReplies", True)):
        return
    from aichat import MENTION_RE, reply
    if not s.get("replyAll", True) and not MENTION_RE.search(text):
        return
    bid = ai_bot_id(cur)
    if not bid:
        return
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE NOT is_bot")
    answer = reply(text, user_name, {"users": int(cur.fetchone()[0])})
    if answer:
        cur.execute(f"INSERT INTO {SCHEMA}.chat_messages (room, user_id, text) VALUES ('{esc(room)}', {bid}, '{esc(answer[:1000])}')")


def post_item(r) -> dict:
    return {"id": r[0], "title": r[1], "body": r[2], "links": json.loads(r[3] or "[]"), "kind": r[4], "createdAt": r[5].isoformat()}


def handle_aibot(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        is_admin = False
        if token:
            cur.execute(
                f"SELECT u.is_admin FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = '{token}' AND s.expires_at > NOW()"
            )
            r = cur.fetchone()
            is_admin = bool(r and r[0])
        s = load_settings(cur)
        cols = "id, title, body, links, kind, created_at"

        if method == "GET" and qs.get("admin") == "1":
            if not is_admin:
                return resp(403, {"error": "Доступ только для администратора"})
            cur.execute(
                f"SELECT l.id, l.room, l.text, l.reason, l.created_at, u.name, u.email FROM {SCHEMA}.ai_moderation_log l "
                f"LEFT JOIN {SCHEMA}.users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT 50"
            )
            log = [{"id": x[0], "room": x[1], "text": x[2], "reason": x[3], "createdAt": x[4].isoformat(),
                    "user": x[5] or (x[6] or "").split("@")[0] or "Участник"} for x in cur.fetchall()]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.ai_moderation_log WHERE created_at > NOW() - INTERVAL '7 days'")
            blocked = int(cur.fetchone()[0])
            bid = ai_bot_id(cur)
            reactions = 0
            if bid:
                cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.news_reactions WHERE user_id = {bid}")
                reactions = int(cur.fetchone()[0])
            cur.execute(f"SELECT {cols} FROM {SCHEMA}.ai_posts ORDER BY id DESC LIMIT 50")
            posts = [post_item(x) for x in cur.fetchall()]
            return resp(200, {"settings": s, "log": log, "stats": {"blocked7d": blocked, "reactions": reactions, "posts": len(posts)}, "posts": posts, "botId": bid})

        if method == "GET":
            maybe_daily(cur, s)
            maybe_autopost(cur, s)
            cur.execute(f"SELECT {cols} FROM {SCHEMA}.ai_posts ORDER BY id DESC LIMIT 30")
            return resp(200, {"posts": [post_item(x) for x in cur.fetchall()], "botId": ai_bot_id(cur)})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not is_admin:
            return resp(403, {"error": "Доступ только для администратора"})
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "settings":
            data = {
                "enabled": bool(body.get("enabled", True)),
                "moderation": bool(body.get("moderation", True)),
                "blockLinks": bool(body.get("blockLinks", True)),
                "blockCaps": bool(body.get("blockCaps", True)),
                "stopWords": str(body.get("stopWords", ""))[:3000],
                "reactShare": max(0, min(int(body.get("reactShare", 90) or 0), 100)),
                "likeShare": max(0, min(int(body.get("likeShare", 70) or 0), 100)),
                "autoNews": bool(body.get("autoNews", True)),
                "newsHours": max(1, min(int(body.get("newsHours", 6) or 6), 48)),
                "chatReplies": bool(body.get("chatReplies", True)),
                "replyAll": bool(body.get("replyAll", True)),
                "dailyPrices": bool(body.get("dailyPrices", True)),
            }
            val = esc(json.dumps(data, ensure_ascii=False))
            cur.execute(
                f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('ai_bot', '{val}', NOW()) "
                f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
            )
            return resp(200, {"settings": data})

        if action == "post":
            title = re.sub(r"\s+", " ", str(body.get("title", ""))).strip()[:200]
            text = str(body.get("body", "")).strip()[:5000]
            if len(title) < 2:
                return resp(400, {"error": "Заголовок — минимум 2 символа"})
            cur.execute(f"INSERT INTO {SCHEMA}.ai_posts (title, body, kind) VALUES ('{esc(title)}', '{esc(text)}', 'manual') RETURNING {cols}")
            return resp(200, {"post": post_item(cur.fetchone())})

        if action == "digest":
            pid = make_digest(cur, "auto")
            if not pid:
                return resp(400, {"error": "За сутки нет новостей с реакциями — дайджест собирать не из чего"})
            return resp(200, {"id": pid})

        if action == "daily-now":
            from aichat import daily_body, date_title, msk
            t = msk()
            cur.execute(
                f"INSERT INTO {SCHEMA}.ai_posts (title, body, kind) VALUES ('{esc('Сводка рынка на ' + date_title(t))}', '{esc(daily_body())}', 'manual') RETURNING id"
            )
            return resp(200, {"id": cur.fetchone()[0]})

        if action == "delete-post":
            cur.execute(f"DELETE FROM {SCHEMA}.ai_posts WHERE id = {int(body.get('id', 0) or 0)}")
            return resp(200, {"ok": True})

        if action == "clear-log":
            cur.execute(f"DELETE FROM {SCHEMA}.ai_moderation_log")
            return resp(200, {"ok": True})

        return resp(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
