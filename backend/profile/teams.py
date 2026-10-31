import os

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
TEAMS = ("bull", "bear")
CHANGE_PRICE = 100
COOLDOWN_DAYS = 30


def team_state(cur, uid: int) -> dict:
    cur.execute(
        f"SELECT team, team_changed_at, "
        f"GREATEST(0, CEIL(EXTRACT(EPOCH FROM (team_changed_at + INTERVAL '{COOLDOWN_DAYS} days' - NOW())) / 86400))::int "
        f"FROM {SCHEMA}.users WHERE id = {int(uid)}"
    )
    r = cur.fetchone()
    team = r[0] if r and r[0] in TEAMS else ""
    days_left = int(r[2]) if r and r[1] is not None and r[2] is not None else 0
    cur.execute(f"SELECT balance FROM {SCHEMA}.paper_accounts WHERE user_id = {int(uid)}")
    acc = cur.fetchone()
    wallet = float(acc[0]) if acc else 0.0
    return {"team": team, "daysLeft": days_left, "free": team == "" or days_left == 0, "price": CHANGE_PRICE, "wallet": wallet}


def change_team(cur, uid: int, new_team: str, pay: bool) -> tuple:
    if new_team not in TEAMS:
        return 400, {"error": "Выберите команду: Быки или Медведи"}
    st = team_state(cur, uid)
    if st["team"] == new_team:
        return 400, {"error": "Вы уже в этой команде"}
    if st["team"] == "" or st["free"]:
        cur.execute(f"UPDATE {SCHEMA}.users SET team = '{new_team}', team_changed_at = NOW() WHERE id = {int(uid)}")
        return 200, {"team": team_state(cur, uid), "paid": False}
    if not pay:
        return 402, {"error": f"Команду можно менять раз в месяц. До бесплатной смены осталось дней: {st['daysLeft']}. Или смените за {CHANGE_PRICE} ТКА", "needPay": True, "team": st}
    cur.execute(f"SELECT balance FROM {SCHEMA}.paper_accounts WHERE user_id = {int(uid)} FOR UPDATE")
    acc = cur.fetchone()
    free = float(acc[0]) if acc else 0.0
    if free < CHANGE_PRICE:
        return 402, {"error": f"Не хватает ТКА: нужно {CHANGE_PRICE}, свободно {int(free)}", "team": st}
    cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance - {CHANGE_PRICE} WHERE user_id = {int(uid)}")
    cur.execute(
        f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({int(uid)}, -{CHANGE_PRICE}, 'team', 'Смена команды')"
    )
    cur.execute(f"UPDATE {SCHEMA}.users SET team = '{new_team}', team_changed_at = NOW() WHERE id = {int(uid)}")
    return 200, {"team": team_state(cur, uid), "paid": True}
