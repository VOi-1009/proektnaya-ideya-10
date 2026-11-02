import os

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
YEAR = 365 * 86400
TERMS = (0, 7, 30, 90)


def q(v) -> str:
    return str(v).replace("'", "''")


def num(v, d=0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


def pools(cur, only_enabled=False) -> list:
    cond = "WHERE p.enabled AND l.status IN ('trading', 'halted')" if only_enabled else ""
    cur.execute(
        f"SELECT p.id, p.coin_slug, l.name, l.symbol, l.color, l.icon_url, l.price, p.term_days, p.apy, p.min_amount, p.max_total, p.enabled, "
        f"COALESCE((SELECT SUM(amount) FROM {SCHEMA}.stakes s WHERE s.pool_id = p.id AND s.status = 'active'), 0), "
        f"COALESCE((SELECT COUNT(DISTINCT user_id) FROM {SCHEMA}.stakes s WHERE s.pool_id = p.id AND s.status = 'active'), 0) "
        f"FROM {SCHEMA}.staking_pools p JOIN {SCHEMA}.listings l ON l.slug = p.coin_slug {cond} ORDER BY l.sort, p.coin_slug, p.term_days"
    )
    return [
        {"id": r[0], "slug": r[1], "name": r[2], "symbol": r[3], "color": r[4], "iconUrl": r[5], "price": float(r[6]), "termDays": r[7],
         "apy": float(r[8]), "minAmount": float(r[9]), "maxTotal": float(r[10]), "enabled": bool(r[11]), "staked": float(r[12]), "stakers": int(r[13])}
        for r in cur.fetchall()
    ]


def earned_of(amount, apy, start, end) -> float:
    secs = max((end - start).total_seconds(), 0)
    return amount * apy / 100 * secs / YEAR


def user_stakes(cur, uid) -> list:
    cur.execute(
        f"SELECT s.id, s.pool_id, p.coin_slug, l.symbol, p.term_days, s.amount, s.apy, s.created_at, s.ends_at, s.last_claim_at, NOW() "
        f"FROM {SCHEMA}.stakes s JOIN {SCHEMA}.staking_pools p ON p.id = s.pool_id JOIN {SCHEMA}.listings l ON l.slug = p.coin_slug "
        f"WHERE s.user_id = {int(uid)} AND s.status = 'active' ORDER BY s.id DESC"
    )
    out = []
    for sid, pid, slug, sym, term, amount, apy, created, ends, claim, now in cur.fetchall():
        end = min(now, ends) if ends else now
        out.append({
            "id": sid, "poolId": pid, "slug": slug, "symbol": sym, "termDays": term, "amount": float(amount), "apy": float(apy),
            "createdAt": created.isoformat() + "Z", "endsAt": (ends.isoformat() + "Z") if ends else "",
            "earned": round(earned_of(float(amount), float(apy), claim, end), 4), "locked": bool(ends and now < ends),
        })
    return out


def public_state(cur, uid) -> dict:
    cur.execute(f"SELECT balance FROM {SCHEMA}.paper_accounts WHERE user_id = {int(uid)}")
    r = cur.fetchone()
    return {"pools": pools(cur, True), "stakes": user_stakes(cur, uid), "balance": float(r[0]) if r else 0.0}


def admin_state(cur) -> dict:
    cur.execute(f"SELECT slug, name, symbol FROM {SCHEMA}.listings WHERE status IN ('trading', 'halted', 'scheduled', 'draft') ORDER BY sort, id")
    coins = [{"slug": r[0], "name": r[1], "symbol": r[2]} for r in cur.fetchall()]
    cur.execute(f"SELECT COALESCE(SUM(amount), 0), COUNT(DISTINCT user_id) FROM {SCHEMA}.stakes WHERE status = 'active'")
    total, users = cur.fetchone()
    cur.execute(f"SELECT COALESCE(SUM(earned), 0) FROM {SCHEMA}.stakes WHERE status = 'closed'")
    paid = cur.fetchone()[0]
    return {"pools": pools(cur), "coins": coins, "terms": list(TERMS), "totalStaked": float(total), "stakers": int(users), "paid": float(paid)}


def do(cur, uid, act, body, admin) -> tuple:
    if act == "stake_pool_save":
        if not admin:
            return 403, {"error": "Доступ только для администратора"}
        slug = q(str(body.get("slug") or "")[:40])
        term = int(num(body.get("termDays")))
        if term not in TERMS:
            return 400, {"error": "Недопустимый срок"}
        cur.execute(f"SELECT 1 FROM {SCHEMA}.listings WHERE slug = '{slug}'")
        if not cur.fetchone():
            return 400, {"error": "Выберите монету из листинга"}
        apy = max(0.0, min(num(body.get("apy"), 10), 1000.0))
        mn = max(0.01, num(body.get("minAmount"), 10))
        mx = max(0.0, num(body.get("maxTotal")))
        en = "TRUE" if body.get("enabled", True) else "FALSE"
        cur.execute(
            f"INSERT INTO {SCHEMA}.staking_pools (coin_slug, term_days, apy, min_amount, max_total, enabled) VALUES ('{slug}', {term}, {apy}, {mn}, {mx}, {en}) "
            f"ON CONFLICT (coin_slug, term_days) DO UPDATE SET apy = {apy}, min_amount = {mn}, max_total = {mx}, enabled = {en}"
        )
        return 200, admin_state(cur)
    if act == "stake_pool_delete":
        if not admin:
            return 403, {"error": "Доступ только для администратора"}
        pid = int(num(body.get("id")))
        cur.execute(f"SELECT 1 FROM {SCHEMA}.stakes WHERE pool_id = {pid} AND status = 'active' LIMIT 1")
        if cur.fetchone():
            return 400, {"error": "В пуле есть активные стейки, отключите его вместо удаления"}
        cur.execute(f"DELETE FROM {SCHEMA}.staking_pools WHERE id = {pid}")
        return 200, admin_state(cur)
    if act == "stake_open":
        pid = int(num(body.get("poolId")))
        amount = round(num(body.get("amount")), 2)
        cur.execute(f"SELECT p.term_days, p.apy, p.min_amount, p.max_total, p.enabled, l.status FROM {SCHEMA}.staking_pools p JOIN {SCHEMA}.listings l ON l.slug = p.coin_slug WHERE p.id = {pid}")
        p = cur.fetchone()
        if not p or not p[4] or p[5] not in ("trading", "halted"):
            return 400, {"error": "Этот пул недоступен"}
        term, apy, mn, mx = p[0], float(p[1]), float(p[2]), float(p[3])
        if amount < mn:
            return 400, {"error": f"Минимальная сумма {mn:g} USDT"}
        if mx > 0:
            cur.execute(f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.stakes WHERE pool_id = {pid} AND status = 'active'")
            if float(cur.fetchone()[0]) + amount > mx:
                return 400, {"error": "Лимит пула исчерпан"}
        cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance - {amount} WHERE user_id = {int(uid)} AND balance >= {amount} RETURNING balance")
        if not cur.fetchone():
            return 400, {"error": "Недостаточно USDT на балансе"}
        ends = f"NOW() + INTERVAL '{term} days'" if term else "NULL"
        cur.execute(f"INSERT INTO {SCHEMA}.stakes (user_id, pool_id, amount, apy, ends_at) VALUES ({int(uid)}, {pid}, {amount}, {apy}, {ends})")
        return 200, public_state(cur, uid)
    if act == "stake_close":
        sid = int(num(body.get("id")))
        cur.execute(f"SELECT s.amount, s.apy, s.last_claim_at, s.ends_at, NOW() FROM {SCHEMA}.stakes s WHERE s.id = {sid} AND s.user_id = {int(uid)} AND s.status = 'active'")
        s = cur.fetchone()
        if not s:
            return 400, {"error": "Стейк не найден"}
        amount, apy, claim, ends, now = float(s[0]), float(s[1]), s[2], s[3], s[4]
        if ends and now < ends:
            return 400, {"error": "Срок ещё не вышел, забрать можно после даты окончания"}
        end = min(now, ends) if ends else now
        reward = round(earned_of(amount, apy, claim, end), 2)
        cur.execute(f"UPDATE {SCHEMA}.stakes SET status = 'closed', earned = {reward} WHERE id = {sid} AND status = 'active' RETURNING id")
        if not cur.fetchone():
            return 400, {"error": "Стейк уже закрыт"}
        cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance + {amount + reward} WHERE user_id = {int(uid)}")
        out = public_state(cur, uid)
        out["reward"] = reward
        return 200, out
    return 400, {"error": "Неизвестное действие"}
