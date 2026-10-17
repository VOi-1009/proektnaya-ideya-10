LEVELS = [
    (0, "Новичок"),
    (50, "Наблюдатель"),
    (150, "Трейдер"),
    (350, "Аналитик"),
    (700, "Кит"),
]
TITLES = [t for _, t in LEVELS] + ["Медведь", "Бык"]
MAX_LEVEL = len(TITLES)


def points_sql(schema: str, alias: str = "u") -> str:
    a = alias
    return (
        f"((SELECT COUNT(*) FROM {schema}.user_visits v WHERE v.user_id = {a}.id) * 10 "
        f"+ LEAST((SELECT COUNT(*) FROM {schema}.holdings h WHERE h.user_id = {a}.id), 20) * 5 "
        f"+ ((COALESCE({a}.name, '') <> '')::int + ({a}.avatar_url IS NOT NULL)::int + (COALESCE({a}.bio, '') <> '')::int "
        f"+ (COALESCE({a}.city, '') <> '')::int + (COALESCE({a}.favorite_coin, '') <> '')::int) * 6)"
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
