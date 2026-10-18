import hashlib

SPECIAL = [
    ("critic", 25),
    ("voter", 5),
    ("month", 30),
    ("marathon", 30),
    ("investor", 10),
    ("legend", 100),
    ("watcher", 1000),
]


def _h(*parts) -> int:
    return int(hashlib.md5(":".join(str(p) for p in parts).encode()).hexdigest()[:8], 16)


def _pack(values: dict) -> list:
    return [
        {"id": aid, "done": values.get(aid, 0) >= goal, "progress": min(values.get(aid, 0), goal), "goal": goal}
        for aid, goal in SPECIAL
    ]


def special_for(cur, schema: str, uid: int) -> list:
    uid = int(uid)
    cur.execute(
        f"SELECT (SELECT COUNT(*) FROM {schema}.news_reactions WHERE user_id = {uid}), "
        f"(SELECT COUNT(*) FROM {schema}.poll_votes WHERE user_id = {uid}), "
        f"(SELECT COUNT(*) FROM {schema}.user_visits WHERE user_id = {uid}), "
        f"(SELECT COUNT(*) FROM {schema}.holdings WHERE user_id = {uid}), "
        f"(SELECT COALESCE(MAX(c), 0) FROM (SELECT COUNT(*) c FROM (SELECT day, day - (ROW_NUMBER() OVER (ORDER BY day))::int AS g "
        f"FROM {schema}.user_visits WHERE user_id = {uid}) t GROUP BY g) s), "
        f"u.is_bot, COALESCE(u.status_override, 1), COALESCE(u.active_minutes, 0) FROM {schema}.users u WHERE u.id = {uid}"
    )
    r = cur.fetchone()
    if not r:
        return []
    reacts, votes, days, coins, best, is_bot, lvl, mins = (int(r[0]), int(r[1]), int(r[2]), int(r[3]), int(r[4]), bool(r[5]), int(r[6]), int(r[7]))
    if is_bot:
        chance = 20 + lvl * 11
        fake = {}
        for aid, goal in SPECIAL:
            fake[aid] = goal if _h("ach", uid, aid) % 100 < chance else _h("p", uid, aid) % goal
        fake["critic"] = max(fake["critic"], min(reacts, 25))
        fake["voter"] = max(fake["voter"], min(votes, 5))
        return _pack(fake)
    return _pack({"critic": reacts, "voter": votes, "month": days, "marathon": best, "investor": coins, "legend": days, "watcher": mins})
