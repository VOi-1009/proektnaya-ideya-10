import json
import time
import urllib.request
from datetime import datetime, timedelta, timezone

URLS = [
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
    "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
]
TTL = 1800
_cache: dict = {"at": 0.0, "items": None}

COUNTRY = {
    "USD": "США", "EUR": "Еврозона", "GBP": "Великобритания", "JPY": "Япония", "CNY": "Китай",
    "AUD": "Австралия", "CAD": "Канада", "CHF": "Швейцария", "NZD": "Новая Зеландия",
}
WORDS = [
    ("Non-Farm Employment Change", "Занятость в несельхозном секторе (NFP)"),
    ("Unemployment Rate", "Уровень безработицы"),
    ("Unemployment Claims", "Заявки на пособие по безработице"),
    ("Core CPI", "Базовая инфляция (CPI)"),
    ("Core PCE Price Index", "Базовый индекс цен PCE"),
    ("CPI", "Инфляция (CPI)"),
    ("PPI", "Цены производителей (PPI)"),
    ("Federal Funds Rate", "Ставка ФРС"),
    ("FOMC Statement", "Заявление ФРС (FOMC)"),
    ("FOMC Press Conference", "Пресс-конференция ФРС"),
    ("FOMC Meeting Minutes", "Протокол заседания ФРС"),
    ("Fed Chair", "Выступление главы ФРС"),
    ("Main Refinancing Rate", "Ставка ЕЦБ"),
    ("ECB Press Conference", "Пресс-конференция ЕЦБ"),
    ("Monetary Policy Statement", "Заявление по денежно-кредитной политике"),
    ("Monetary Policy Report", "Отчёт по денежно-кредитной политике"),
    ("Official Bank Rate", "Ключевая ставка Банка Англии"),
    ("BOJ Policy Rate", "Ставка Банка Японии"),
    ("Interest Rate Decision", "Решение по ставке"),
    ("Cash Rate", "Ставка центробанка"),
    ("Overnight Rate", "Ставка овернайт"),
    ("Advance GDP", "ВВП, предварительная оценка"),
    ("Prelim GDP", "ВВП, предварительная оценка"),
    ("Final GDP", "ВВП, финальная оценка"),
    ("GDP", "ВВП"),
    ("ISM Manufacturing PMI", "Индекс деловой активности ISM в промышленности"),
    ("ISM Services PMI", "Индекс деловой активности ISM в услугах"),
    ("Manufacturing PMI", "PMI в промышленности"),
    ("Services PMI", "PMI в сфере услуг"),
    ("Retail Sales", "Розничные продажи"),
    ("ADP Non-Farm Employment Change", "Занятость ADP"),
    ("JOLTS Job Openings", "Число вакансий JOLTS"),
    ("Average Hourly Earnings", "Средняя почасовая зарплата"),
    ("Employment Change", "Изменение занятости"),
    ("Trade Balance", "Торговый баланс"),
    ("Crude Oil Inventories", "Запасы сырой нефти"),
    ("RBNZ Rate Statement", "Заявление Резервного банка Новой Зеландии"),
    ("RBNZ Press Conference", "Пресс-конференция Резервного банка Новой Зеландии"),
    ("BOJ Press Conference", "Пресс-конференция Банка Японии"),
    ("BOJ Outlook Report", "Прогноз Банка Японии"),
    ("BOC Rate Statement", "Заявление Банка Канады по ставке"),
    ("BOC Press Conference", "Пресс-конференция Банка Канады"),
    ("BOE Press Conference", "Пресс-конференция Банка Англии"),
    ("MPC Official Bank Rate Votes", "Голосование по ставке Банка Англии"),
    ("Annual Budget Release", "Публикация годового бюджета"),
    ("Rate Statement", "Заявление по ставке"),
    ("Press Conference", "Пресс-конференция"),
    ("Speaks", "выступление"),
]


def ru_title(t: str) -> str:
    for en, ru in WORDS:
        if en.lower() in t.lower():
            suffix = " (м/м)" if "m/m" in t else " (г/г)" if "y/y" in t else " (кв/кв)" if "q/q" in t else ""
            if en == "Speaks":
                return f"{t.replace('Speaks', '').strip()}: выступление"
            return ru + suffix
    return t


def fetch() -> list:
    raw = []
    for i, url in enumerate(URLS):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3) as r:
                raw += json.loads(r.read())
        except Exception as e:
            print("calendar fetch error:", url, e)
            if i == 0:
                raise
    out = []
    for e in raw:
        if e.get("impact") != "High":
            continue
        ts = datetime.fromisoformat(e["date"]).astimezone(timezone.utc)
        msk = ts + timedelta(hours=3)
        out.append({
            "ts": int(ts.timestamp() * 1000),
            "day": msk.strftime("%Y-%m-%d"),
            "time": msk.strftime("%H:%M"),
            "country": COUNTRY.get(e.get("country", ""), e.get("country", "")),
            "currency": e.get("country", ""),
            "title": ru_title(str(e.get("title", ""))),
            "forecast": e.get("forecast") or "",
            "previous": e.get("previous") or "",
        })
    out.sort(key=lambda x: x["ts"])
    return out


def calendar_response(json_resp) -> dict:
    now = time.time()
    if _cache["items"] is None or now - _cache["at"] > TTL:
        try:
            _cache["items"] = fetch()
            _cache["at"] = now
        except Exception as e:
            print("calendar error:", e)
            if _cache["items"] is None:
                return json_resp(502, {"error": "Календарь временно недоступен"}, 60)
    return json_resp(200, {"items": _cache["items"]}, 600)
