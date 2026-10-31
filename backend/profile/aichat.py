import random
import re
import time

from aiprices import fmt_change, fmt_price, prices

SCHEMA_PH = "{S}"
MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]
WEEKDAYS = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"]
DAILY = [("bitcoin", "Bitcoin"), ("ethereum", "Ethereum"), ("brent", "Brent"), ("gold", "Gold")]
ASSETS = [
    ("bitcoin", "Bitcoin", r"биткоин|биток|битк|btc|bitcoin|бтц"),
    ("ethereum", "Ethereum", r"эфир|eth\b|ethereum|этериум|эфириум"),
    ("solana", "Solana", r"солан|\bsol\b|solana"),
    ("toncoin", "Toncoin", r"\bton\b|тон(?:коин)?\b|toncoin"),
    ("xrp", "XRP", r"\bxrp\b|рипл"),
    ("bnb", "BNB", r"\bbnb\b"),
    ("dogecoin", "Dogecoin", r"доге|doge"),
    ("hyperliquid", "Hyperliquid", r"hyperliquid|гиперликвид|\bhype\b|хайп"),
    ("zcash", "Zcash", r"zcash|\bzec\b|зикэш|зкэш|зи-кэш"),
    ("brent", "Нефть Brent", r"нефт|brent|брент"),
    ("gold", "Золото", r"золот|gold|xau"),
    ("usd-rub", "Доллар", r"доллар|usd|бакс"),
    ("eur-rub", "Евро", r"евро|eur"),
]
MENTION_RE = re.compile(r"ai\s*tka|aitka|ai\s*traderka|аи\s*трейдерк|@ai|бот\b|ботик|aitraderka", re.I)


def msk():
    return time.gmtime(time.time() + 3 * 3600)


def date_title(t) -> str:
    return f"{t.tm_mday} {MONTHS[t.tm_mon - 1]} {t.tm_year}"


def price_line(key: str, name: str, p: dict) -> str:
    v = p.get(key)
    if not v:
        return f"{name} — нет данных"
    return f"{name} — {fmt_price(key, v['price'])} ({fmt_change(v['change'])} за сутки)"


def daily_body() -> str:
    p = prices()
    return "\n".join(f"{i}. {price_line(k, n, p)}" for i, (k, n) in enumerate(DAILY, 1))


def reply(text: str, user_name: str, ctx: dict):
    low = text.lower().replace("ё", "е")
    mentioned = bool(MENTION_RE.search(low))
    question = "?" in text or re.match(r"^\s*(как|что|сколько|почему|когда|где|кто|зачем|какой|какая|какие|подскаж|скажи|расскажи)", low)
    greet = re.search(r"^\W*(привет|здравств|добр(ое|ый|ой)|хай|салют|здарова|hello|hi)\b", low)
    if not (mentioned or question or greet):
        return None
    name = user_name or "друг"

    found = [(k, n) for k, n, rx in ASSETS if re.search(rx, low)]
    if found and re.search(r"цен|курс|почем|сколько|стоит|какой|как там|что с|что по|котиров", low):
        p = prices()
        lines = [price_line(k, n, p) for k, n in found[:4]]
        tail = random.choice(["Графики — в канале #котировки.", "Подробнее — в #котировки.", "Это не инвестсовет, просто цифры 🙂"])
        return f"{name}, держи актуальное:\n" + "\n".join(lines) + f"\n{tail}"

    if re.search(r"купить|продать|вкладыват|инвестир|зайти в|шортить|лонг|шорт|вырастет|упадет|прогноз", low):
        return (f"{name}, прогнозов и советов по сделкам не даю — рынок непредсказуем. "
                "Смотри графики в #котировки, новости и индекс страха и жадности на главной, и не рискуй деньгами, которые нельзя потерять.")
    if re.search(r"^\W*(привет|здравств|добр(ое|ый|ой)|хай|салют|здарова|hello|hi)\b", low):
        return random.choice([f"Привет, {name}! Я AiTKA — спроси меня про курс любой монеты, нефти или золота.",
                              f"Здравствуй, {name}! Чем помочь? Могу подсказать цены и как устроен сайт."])
    if re.search(r"как дела|как ты|как настроени", low):
        return random.choice([f"Отлично, {name}! Слежу за рынком 24/7 и за порядком в чате.",
                              f"Всё стабильно, в отличие от крипты 😄 А у тебя как, {name}?"])
    if re.search(r"кто ты|ты кто|что ты умеешь|что умеешь|что можешь|ты бот|ты человек|помощь|help", low):
        return ("Я AiTKA — ИИ-бот TRADERKA.RU. Подсказываю цены (спроси «сколько стоит биткоин?»), "
                "слежу за порядком в чатах, оцениваю новости и каждый день в 00:05 публикую сводку рынка в «Новостях от AiTKA».")
    if re.search(r"какое (сегодня )?число|какая (сегодня )?дата|какой (сегодня )?день|сколько времени|который час", low):
        t = msk()
        return f"Сегодня {WEEKDAYS[t.tm_wday]}, {date_title(t)}, по Москве {t.tm_hour:02d}:{t.tm_min:02d}."
    if re.search(r"онлайн|сколько (нас|участник|человек|людей)", low):
        return f"Сейчас на сайте зарегистрировано {ctx.get('users', 0)} участников. Кто в сети — видно в бегущей строке на главной."
    if re.search(r"статус|уров|очк|рейтинг|ранг", low):
        return ("Очки начисляются за активность: заходы на сайт по дням, монеты в портфеле, заполненный профиль. "
                "Чем больше очков — тем выше статус. Свой прогресс смотри в личном кабинете, общий список — в «Рейтинге».")
    if re.search(r"премиум|промокод|поддерж|донат|задонат", low):
        return ("Поддержать проект можно зелёной кнопкой «Поддержать проект» вверху сайта. После перевода нажми «Я перевёл» — "
                "получишь значок, личный промокод и доступ в Премиум-чат.")
    if re.search(r"правил|можно ли|запрещ|мат|реклам|бан", low):
        return "Правила простые: без мата, рекламы, ссылок, капса и флуда. Такие сообщения я не пропускаю. В остальном — общайтесь свободно!"
    if re.search(r"портфел", low):
        return "В канале #мой-портфель добавь свои монеты — я посчитаю стоимость, прибыль и убыток по текущим ценам."
    if re.search(r"новост", low):
        return "Свежие новости — в каналах #новости-криптовалют и #мировые-новости, а мою ежедневную сводку ищи в «Новостях от AiTKA»."
    if re.search(r"спасиб|благодар|thanks", low):
        return random.choice([f"Всегда пожалуйста, {name}!", "Обращайся 🙌"])
    if re.search(r"рын(ок|ка|ке)|крипт", low) and re.search(r"почему|что (там|с|по)|как", low):
        p = prices()
        b = p.get("bitcoin")
        mood = "растёт" if b and b["change"] > 0.5 else "снижается" if b and b["change"] < -0.5 else "стоит почти на месте"
        return (f"{name}, рынок сейчас {mood}. " + "; ".join(price_line(k, n, p) for k, n in DAILY[:2]) +
                ". Причины обычно в новостях — загляни в #новости-криптовалют и #мировые-новости.")
    if re.search(r"индекс страха|страх и жадн|fear", low):
        return "Индекс страха и жадности показан на главной в «Сводке по рынку»: ниже 25 — паника, выше 75 — эйфория."
    if found:
        p = prices()
        return "\n".join(price_line(k, n, p) for k, n in found[:4])
    if mentioned:
        return (f"{name}, пока не знаю, как на это ответить. Спроси меня про курс монеты, нефти, золота, доллара — "
                "или как работают статусы, портфель и Премиум.")
    return None
