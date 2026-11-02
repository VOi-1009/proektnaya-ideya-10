import datetime
import os

from status import points_sql

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")

KINDS = {
    "trader": {"name": "Трейдерский", "unit": "USDT", "hint": "Побеждает тот, кто заработал больше на тренировочной бирже за время турнира."},
    "games": {"name": "Мини-игры", "unit": "TKA", "hint": "Побеждает тот, кто выиграл больше TKA в мини-играх за время турнира."},
    "activity": {"name": "Активность", "unit": "очков", "hint": "Побеждает тот, кто набрал больше очков активности за время турнира."},
    "teams": {"name": "Быки против медведей", "unit": "USDT", "hint": "Команды соревнуются по сумме прибыли участников на бирже. Призы делят участники команды-победителя."},
    "lottery": {"name": "Лотерея", "unit": "", "hint": "Призовые места разыгрываются случайно среди всех участников."},
}
STATUS_RU = {"upcoming": "Скоро старт", "active": "Идёт", "finished": "Завершён", "cancelled": "Отменён"}


def q(v) -> str:
    return str(v).replace("'", "''").replace("\\", "")


def iso(dt) -> str:
    return dt.isoformat() + ("Z" if dt.tzinfo is None else "")


def parse_split(raw: str) -> list:
    parts = []
    for p in str(raw or "").split(","):
        p = p.strip()
        if p.isdigit() and int(p) > 0:
            parts.append(int(p))
    parts = parts[:10]
    total = sum(parts)
    if not parts or total != 100:
        return [60, 30, 10]
    return parts


def level_of(cur, uid: int) -> int:
    from status import level_for

    cur.execute(f"SELECT {points_sql(SCHEMA)}, u.status_override FROM {SCHEMA}.users u WHERE u.id = {int(uid)}")
    r = cur.fetchone()
    return int(level_for(int(r[0]), r[1])["level"]) if r else 1


def tka_balance(cur, uid: int) -> float:
    cur.execute(f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.tka_ledger WHERE user_id = {int(uid)}")
    return float(cur.fetchone()[0])


def lifecycle(cur) -> None:
    cur.execute(f"UPDATE {SCHEMA}.tournaments SET status = 'active' WHERE status = 'upcoming' AND starts_at <= NOW() AND ends_at > NOW()")
    cur.execute(f"SELECT id FROM {SCHEMA}.tournaments WHERE status IN ('upcoming', 'active') AND ends_at <= NOW()")
    for (tid,) in cur.fetchall():
        finish(cur, int(tid))


def scores(cur, t: dict) -> list:
    """Возвращает [(user_id, team, score)] по убыванию результата."""
    kind = t["kind"]
    tid = t["id"]
    start = t["startsAtRaw"]
    end = t["endsAtRaw"]
    cur.execute(f"SELECT user_id, team FROM {SCHEMA}.tournament_entries WHERE tournament_id = {tid}")
    members = [(int(r[0]), r[1] or "") for r in cur.fetchall()]
    out = []
    for uid, team in members:
        if kind in ("trader", "teams"):
            cur.execute(
                f"SELECT COALESCE(SUM(pnl), 0) FROM {SCHEMA}.paper_positions WHERE user_id = {uid} AND status = 'closed' "
                f"AND COALESCE(close_reason, '') <> 'reset' AND closed_at >= '{start}' AND closed_at <= '{end}'"
            )
        elif kind == "games":
            cur.execute(
                f"SELECT COALESCE(SUM(payout - bet), 0) FROM {SCHEMA}.games_log WHERE user_id = {uid} AND created_at >= '{start}' AND created_at <= '{end}'"
            )
        elif kind == "activity":
            cur.execute(
                f"SELECT (SELECT COUNT(*) FROM {SCHEMA}.user_visits v WHERE v.user_id = {uid} AND v.day >= '{start}'::date AND v.day <= '{end}'::date) * 10 "
                f"+ (SELECT COUNT(*) FROM {SCHEMA}.paper_positions p WHERE p.user_id = {uid} AND p.opened_at >= '{start}' AND p.opened_at <= '{end}') * 3 "
                f"+ (SELECT COUNT(*) FROM {SCHEMA}.games_log g WHERE g.user_id = {uid} AND g.created_at >= '{start}' AND g.created_at <= '{end}')"
            )
        else:
            cur.execute("SELECT random()")
        out.append((uid, team, float(cur.fetchone()[0] or 0)))
    out.sort(key=lambda x: (-x[2], x[0]))
    return out


def tka_out(cur, uid: int, amount: float, note: str) -> None:
    cur.execute(f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({int(uid)}, {amount}, 'gift', '{q(note)[:120]}')")


def finish(cur, tid: int, force: bool = False) -> dict:
    cur.execute(
        f"UPDATE {SCHEMA}.tournaments SET status = 'finished', finished_at = NOW() WHERE id = {int(tid)} AND status IN ('upcoming', 'active') RETURNING 1"
    )
    if not cur.fetchone():
        return {"ok": False}
    t = get_row(cur, tid)
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.tournament_entries WHERE tournament_id = {tid}")
    players = int(cur.fetchone()[0])
    title = t["title"]
    if players < max(1, t["minPlayers"]):
        cur.execute(f"UPDATE {SCHEMA}.tournaments SET status = 'cancelled' WHERE id = {tid}")
        cur.execute(f"SELECT user_id, paid FROM {SCHEMA}.tournament_entries WHERE tournament_id = {tid} AND paid > 0")
        for uid, paid in cur.fetchall():
            tka_out(cur, int(uid), float(paid), f"Возврат взноса: турнир «{title}» не состоялся")
        if t["prizePool"] > 0:
            cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES (0, {t['prizePool']}, 'deposit', '{q('Возврат приза: турнир «' + title + '» не состоялся')[:120]}')")
        return {"ok": True, "cancelled": True}

    ranked = scores(cur, t)
    cur.execute(f"SELECT COALESCE(SUM(paid), 0) FROM {SCHEMA}.tournament_entries WHERE tournament_id = {tid}")
    paid_total = float(cur.fetchone()[0])
    fee = round(paid_total * t["feePercent"] / 100, 2)
    bank = round(t["prizePool"] + paid_total - fee, 2)
    if fee > 0:
        cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES (0, {fee}, 'fee', '{q('Комиссия турнира «' + title + '»')[:120]}')")
    split = parse_split(t["prizeSplit"])
    winners = []
    if t["kind"] == "teams":
        by = {"bull": 0.0, "bear": 0.0}
        cnt = {"bull": 0, "bear": 0}
        for _, team, sc in ranked:
            if team in by:
                by[team] += sc
                cnt[team] += 1
        win_team = "bull" if by["bull"] >= by["bear"] else "bear"
        if not cnt[win_team]:
            win_team = "bull" if cnt["bull"] else "bear"
        members = [r for r in ranked if r[1] == win_team]
        share = round(bank / max(1, len(members)), 2) if members else 0.0
        for i, (uid, team, sc) in enumerate(members, 1):
            winners.append((uid, i, sc, share))
    else:
        if t["kind"] == "lottery":
            ranked = sorted(ranked, key=lambda x: x[2])
        for i, pct in enumerate(split):
            if i >= len(ranked):
                break
            if t["kind"] in ("trader", "games") and ranked[i][2] <= 0:
                break
            winners.append((ranked[i][0], i + 1, ranked[i][2], round(bank * pct / 100, 2)))
    paid_out = 0.0
    for uid, place, sc, prize in winners:
        paid_out += prize
        tka_out(cur, uid, prize, f"Приз турнира «{title}»: место {place}")
        cur.execute(
            f"UPDATE {SCHEMA}.tournament_entries SET place = {place}, score = {round(sc, 4)}, prize = {prize} WHERE tournament_id = {tid} AND user_id = {uid}"
        )
        if place == 1 and t["badgeItemId"]:
            cur.execute(
                f"INSERT INTO {SCHEMA}.shop_purchases (user_id, item_id, price, source) VALUES ({uid}, {int(t['badgeItemId'])}, 0, 'gift') ON CONFLICT DO NOTHING"
            )
    for uid, team, sc in ranked:
        cur.execute(f"UPDATE {SCHEMA}.tournament_entries SET score = {round(sc, 4)} WHERE tournament_id = {tid} AND user_id = {uid} AND score IS NULL")
    left = round(bank - paid_out, 2)
    if left > 0.01:
        cur.execute(f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES (0, {left}, 'deposit', '{q('Остаток турнира «' + title + '»')[:120]}')")
    return {"ok": True, "winners": len(winners)}


COLS = (
    "id, title, description, kind, entry_fee, prize_pool, prize_split, fee_percent, min_players, max_players, min_level, "
    "starts_at, ends_at, status, badge_item_id, finished_at"
)


def row_to_dict(r) -> dict:
    return {
        "id": r[0], "title": r[1], "description": r[2], "kind": r[3], "entryFee": float(r[4]), "prizePool": float(r[5]),
        "prizeSplit": r[6], "feePercent": float(r[7]), "minPlayers": int(r[8]), "maxPlayers": int(r[9]), "minLevel": int(r[10]),
        "startsAt": iso(r[11]), "endsAt": iso(r[12]), "startsAtRaw": r[11].strftime("%Y-%m-%d %H:%M:%S"),
        "endsAtRaw": r[12].strftime("%Y-%m-%d %H:%M:%S"), "status": r[13], "badgeItemId": r[14],
        "finishedAt": iso(r[15]) if r[15] else None,
    }


def get_row(cur, tid: int):
    cur.execute(f"SELECT {COLS} FROM {SCHEMA}.tournaments WHERE id = {int(tid)}")
    r = cur.fetchone()
    return row_to_dict(r) if r else None


def public_item(t: dict) -> dict:
    out = {k: v for k, v in t.items() if k not in ("startsAtRaw", "endsAtRaw")}
    out["kindName"] = KINDS.get(t["kind"], {}).get("name", t["kind"])
    out["unit"] = KINDS.get(t["kind"], {}).get("unit", "")
    out["hint"] = KINDS.get(t["kind"], {}).get("hint", "")
    out["split"] = parse_split(t["prizeSplit"])
    return out


def list_for(cur, uid) -> dict:
    lifecycle(cur)
    me = int(uid or 0)
    cur.execute(f"SELECT {COLS} FROM {SCHEMA}.tournaments ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, ends_at DESC LIMIT 40")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    ids = [t["id"] for t in rows] or [0]
    cur.execute(
        f"SELECT tournament_id, COUNT(*), COALESCE(SUM(paid), 0) FROM {SCHEMA}.tournament_entries "
        f"WHERE tournament_id IN ({','.join(str(i) for i in ids)}) GROUP BY tournament_id"
    )
    counts = {int(r[0]): (int(r[1]), float(r[2])) for r in cur.fetchall()}
    mine = {}
    if me:
        cur.execute(f"SELECT tournament_id, place, prize, score FROM {SCHEMA}.tournament_entries WHERE user_id = {me}")
        mine = {int(r[0]): {"place": r[1], "prize": float(r[2]), "score": float(r[3]) if r[3] is not None else None} for r in cur.fetchall()}
    items = []
    for t in rows:
        it = public_item(t)
        n, paid = counts.get(t["id"], (0, 0.0))
        it["players"] = n
        it["bank"] = round(t["prizePool"] + paid * (1 - t["feePercent"] / 100), 2)
        it["joined"] = t["id"] in mine
        it["mine"] = mine.get(t["id"])
        items.append(it)
    return {"items": items, "kinds": {k: v["name"] for k, v in KINDS.items()}, "balance": tka_balance(cur, me) if me else 0.0}


def leaderboard(cur, tid: int) -> dict:
    lifecycle(cur)
    t = get_row(cur, tid)
    if not t:
        return {"error": "Турнир не найден"}
    cur.execute(
        f"SELECT e.user_id, e.team, e.place, e.score, e.prize, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)), COALESCE(u.avatar_url, '') "
        f"FROM {SCHEMA}.tournament_entries e JOIN {SCHEMA}.users u ON u.id = e.user_id WHERE e.tournament_id = {int(tid)}"
    )
    info = {int(r[0]): r for r in cur.fetchall()}
    if t["status"] == "finished":
        order = sorted(info.values(), key=lambda r: (r[2] is None, r[2] or 0, -(float(r[3]) if r[3] is not None else 0)))
        rows = [{"userId": int(r[0]), "name": r[5], "avatar": r[6], "team": r[1], "place": r[2], "score": float(r[3]) if r[3] is not None else 0.0, "prize": float(r[4])} for r in order]
    elif t["status"] == "active" and t["kind"] != "lottery":
        live = scores(cur, t)
        rows = [
            {"userId": uid, "name": info[uid][5], "avatar": info[uid][6], "team": team, "place": i + 1, "score": round(sc, 2), "prize": 0.0}
            for i, (uid, team, sc) in enumerate(live)
            if uid in info
        ]
    else:
        rows = [{"userId": int(r[0]), "name": r[5], "avatar": r[6], "team": r[1], "place": None, "score": 0.0, "prize": 0.0} for r in info.values()]
    teams = None
    if t["kind"] == "teams":
        teams = {"bull": 0.0, "bear": 0.0}
        for r in rows:
            if r["team"] in teams:
                teams[r["team"]] = round(teams[r["team"]] + r["score"], 2)
    return {"tournament": public_item(t), "rows": rows[:100], "teams": teams}


def join(cur, uid: int, tid: int) -> tuple:
    lifecycle(cur)
    t = get_row(cur, tid)
    if not t:
        return 404, {"error": "Турнир не найден"}
    if t["status"] not in ("upcoming", "active"):
        return 400, {"error": "Этот турнир уже завершён"}
    cur.execute(f"SELECT 1 FROM {SCHEMA}.tournament_entries WHERE tournament_id = {tid} AND user_id = {uid}")
    if cur.fetchone():
        return 400, {"error": "Вы уже участвуете"}
    if t["minLevel"] > 1 and level_of(cur, uid) < t["minLevel"]:
        return 403, {"error": f"Для этого турнира нужен статус выше: уровень {t['minLevel']}"}
    if t["maxPlayers"]:
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.tournament_entries WHERE tournament_id = {tid}")
        if int(cur.fetchone()[0]) >= t["maxPlayers"]:
            return 400, {"error": "Все места заняты"}
    cur.execute(f"SELECT COALESCE(team, '') FROM {SCHEMA}.users WHERE id = {uid}")
    team = (cur.fetchone() or [""])[0]
    if t["kind"] == "teams" and team not in ("bull", "bear"):
        return 400, {"error": "Для командного турнира выберите команду в профиле: Быки или Медведи"}
    fee = t["entryFee"]
    if fee > 0:
        cur.execute(
            f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) "
            f"SELECT {uid}, -{fee}, 'shop', '{q('Взнос: турнир «' + t['title'] + '»')[:120]}' "
            f"WHERE (SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.tka_ledger WHERE user_id = {uid}) >= {fee} RETURNING id"
        )
        if not cur.fetchone():
            return 400, {"error": "Недостаточно TKA на кошельке для взноса"}
    cur.execute(
        f"INSERT INTO {SCHEMA}.tournament_entries (tournament_id, user_id, team, paid) VALUES ({tid}, {uid}, '{q(team)}', {fee}) "
        f"ON CONFLICT (tournament_id, user_id) DO NOTHING RETURNING id"
    )
    if not cur.fetchone():
        return 400, {"error": "Вы уже участвуете"}
    return 200, {"ok": True, "paid": fee}


def leave(cur, uid: int, tid: int) -> tuple:
    t = get_row(cur, tid)
    if not t or t["status"] != "upcoming":
        return 400, {"error": "Выйти можно только до старта турнира"}
    cur.execute(f"DELETE FROM {SCHEMA}.tournament_entries WHERE tournament_id = {tid} AND user_id = {uid} RETURNING paid")
    r = cur.fetchone()
    if not r:
        return 400, {"error": "Вы не участвуете"}
    if float(r[0]) > 0:
        tka_out(cur, uid, float(r[0]), f"Возврат взноса: выход из турнира «{t['title']}»")
    return 200, {"ok": True, "refund": float(r[0])}


def clean_input(body: dict) -> dict:
    kind = str(body.get("kind") or "")
    if kind not in KINDS:
        raise ValueError("Выберите вид турнира")
    title = str(body.get("title") or "").strip()[:120]
    if len(title) < 3:
        raise ValueError("Название — минимум 3 символа")
    try:
        starts = datetime.datetime.strptime(str(body.get("startsAt") or "")[:19].replace("T", " "), "%Y-%m-%d %H:%M:%S")
        ends = datetime.datetime.strptime(str(body.get("endsAt") or "")[:19].replace("T", " "), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        raise ValueError("Укажите даты начала и окончания")
    if ends <= starts:
        raise ValueError("Окончание должно быть позже начала")
    if ends - starts > datetime.timedelta(days=60):
        raise ValueError("Турнир не может идти дольше 60 дней")
    split = ",".join(str(p) for p in parse_split(body.get("prizeSplit") or "60,30,10"))
    return {
        "title": title,
        "description": str(body.get("description") or "").strip()[:600],
        "kind": kind,
        "entry_fee": max(0.0, min(round(float(body.get("entryFee") or 0), 2), 1000000.0)),
        "prize_pool": max(0.0, min(round(float(body.get("prizePool") or 0), 2), 10000000.0)),
        "prize_split": split,
        "fee_percent": max(0.0, min(round(float(body.get("feePercent") or 0), 2), 50.0)),
        "min_players": max(1, min(int(body.get("minPlayers") or 2), 10000)),
        "max_players": max(0, min(int(body.get("maxPlayers") or 0), 100000)),
        "min_level": max(1, min(int(body.get("minLevel") or 1), 20)),
        "starts": starts.strftime("%Y-%m-%d %H:%M:%S"),
        "ends": ends.strftime("%Y-%m-%d %H:%M:%S"),
        "badge": int(body.get("badgeItemId") or 0),
    }


def admin_list(cur) -> dict:
    lifecycle(cur)
    cur.execute(f"SELECT {COLS} FROM {SCHEMA}.tournaments ORDER BY id DESC LIMIT 60")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    ids = [t["id"] for t in rows] or [0]
    cur.execute(
        f"SELECT tournament_id, COUNT(*), COALESCE(SUM(paid), 0), COALESCE(SUM(prize), 0) FROM {SCHEMA}.tournament_entries "
        f"WHERE tournament_id IN ({','.join(str(i) for i in ids)}) GROUP BY tournament_id"
    )
    c = {int(r[0]): (int(r[1]), float(r[2]), float(r[3])) for r in cur.fetchall()}
    items = []
    for t in rows:
        it = public_item(t)
        n, paid, prizes = c.get(t["id"], (0, 0.0, 0.0))
        it.update(players=n, paid=paid, prizesPaid=prizes)
        items.append(it)
    cur.execute(f"SELECT id, name FROM {SCHEMA}.shop_items WHERE kind = 'badge' ORDER BY sort, id")
    badges = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
    return {"items": items, "kinds": {k: {"name": v["name"], "hint": v["hint"]} for k, v in KINDS.items()}, "badges": badges}
