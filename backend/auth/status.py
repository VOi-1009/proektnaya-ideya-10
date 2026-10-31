LEVELS = [
    (0, "Новичок"),
    (300, "Студент"),
    (750, "Наблюдатель"),
    (1050, "Скальпер"),
    (1350, "Свингер"),
    (1650, "Стратег"),
    (1950, "Рыночный волк"),
    (2250, "Трейдер"),
    (5250, "Аналитик"),
    (10500, "Кит"),
]
TITLES = [t for _, t in LEVELS] + ["Медведь", "Бык", "Модератор", "Администрация"]
MAX_LEVEL = len(TITLES)


def points_sql(schema: str, alias: str = "u") -> str:
    a = alias
    return (
        f"((SELECT COUNT(*) FROM {schema}.user_visits v WHERE v.user_id = {a}.id) * 10 "
        f"+ LEAST((SELECT COUNT(*) FROM {schema}.holdings h WHERE h.user_id = {a}.id), 20) * 5 "
        f"+ ((COALESCE({a}.name, '') <> '')::int + ({a}.avatar_url IS NOT NULL)::int + (COALESCE({a}.bio, '') <> '')::int "
        f"+ (COALESCE({a}.city, '') <> '')::int + (COALESCE({a}.favorite_coin, '') <> '')::int) * 6 "
        f"+ (COALESCE({a}.active_minutes, 0) / 10) * 2 "
        f"+ COALESCE({a}.bonus_points, 0) "
        f"+ COALESCE((SELECT SUM(w.points) FROM {schema}.paper_awards w WHERE w.user_id = {a}.id), 0))"
    )


def level_for(points: int, override=None) -> dict:
    idx = 0
    for i, (need, _) in enumerate(LEVELS):
        if points >= need:
            idx = i
    manual = override is not None and 1 <= int(override) <= MAX_LEVEL
    if manual:
        idx = int(override) - 1
    nxt = LEVELS[idx + 1] if not manual and idx + 1 < len(LEVELS) else None
    return {
        "level": idx + 1,
        "title": TITLES[idx],
        "points": points,
        "current": LEVELS[idx][0] if idx < len(LEVELS) else 0,
        "next": nxt[0] if nxt else None,
        "nextTitle": nxt[1] if nxt else None,
        "manual": manual,
    }
