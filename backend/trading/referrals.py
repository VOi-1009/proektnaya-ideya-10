import json
import os
import re

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
KEY = "referral_settings"
DEFAULT = {
    "enabled": True,
    "rewardTka": 5000.0,
    "rewardUsdt": 5000.0,
    "fundTka": 5000.0,
    "friendBonusTka": 0.0,
    "trigger": "first_action",
    "maxPerUser": 20,
    "title": "Приведи друга",
    "text": "Отправьте другу свою ссылку или промокод. Когда друг зарегистрируется и сделает первую сделку или сыграет в мини-игру, вы получите награду, а такая же сумма уйдёт в общий фонд.",
}
TRIGGERS = {"register": "Сразу после регистрации друга", "first_action": "После первой сделки или игры друга"}


def q(v) -> str:
    return str(v).replace("'", "''").replace("\\", "")


def settings(cur) -> dict:
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = '{KEY}'")
    row = cur.fetchone()
    out = dict(DEFAULT)
    try:
        raw = json.loads(row[0]) if row and row[0] else {}
    except ValueError:
        raw = {}
    try:
        out["enabled"] = bool(raw.get("enabled", True))
        for k in ("rewardTka", "rewardUsdt", "fundTka", "friendBonusTka"):
            out[k] = max(0.0, min(round(float(raw.get(k, DEFAULT[k])), 2), 1000000.0))
        out["maxPerUser"] = max(0, min(int(raw.get("maxPerUser", 20)), 100000))
        out["trigger"] = raw.get("trigger") if raw.get("trigger") in TRIGGERS else "first_action"
        out["title"] = str(raw.get("title") or DEFAULT["title"]).strip()[:60]
        out["text"] = str(raw.get("text") or DEFAULT["text"]).strip()[:500]
    except (TypeError, ValueError):
        pass
    return out


def save_settings(cur, body: dict) -> dict:
    new = settings_from(body)
    val = q(json.dumps(new, ensure_ascii=False))
    cur.execute(
        f"INSERT INTO {SCHEMA}.site_settings (key, value, updated_at) VALUES ('{KEY}', '{val}', NOW()) "
        f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
    )
    return new


def settings_from(body: dict) -> dict:
    out = dict(DEFAULT)
    out["enabled"] = bool(body.get("enabled", True))
    for k in ("rewardTka", "rewardUsdt", "fundTka", "friendBonusTka"):
        out[k] = max(0.0, min(round(float(body.get(k, DEFAULT[k])), 2), 1000000.0))
    out["maxPerUser"] = max(0, min(int(body.get("maxPerUser", 20)), 100000))
    out["trigger"] = body.get("trigger") if body.get("trigger") in TRIGGERS else "first_action"
    out["title"] = str(body.get("title") or DEFAULT["title"]).strip()[:60]
    out["text"] = str(body.get("text") or DEFAULT["text"]).strip()[:500]
    return out


def find_inviter(cur, code: str, friend_id: int):
    code = re.sub(r"[^A-Za-z0-9]", "", str(code or "")).upper()[:24]
    if not code:
        return None
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE UPPER(promo_code) = '{q(code)}' AND NOT is_bot AND NOT is_ai LIMIT 1")
    row = cur.fetchone()
    if not row or int(row[0]) == int(friend_id):
        return None
    return int(row[0])


def register_friend(cur, friend_id: int, code: str, source: str = "link") -> bool:
    st = settings(cur)
    if not st["enabled"]:
        return False
    inviter = find_inviter(cur, code, friend_id)
    if not inviter:
        return False
    cur.execute(f"SELECT 1 FROM {SCHEMA}.referrals WHERE friend_id = {int(friend_id)}")
    if cur.fetchone():
        return False
    if st["maxPerUser"] > 0:
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.referrals WHERE inviter_id = {inviter}")
        if int(cur.fetchone()[0]) >= st["maxPerUser"]:
            return False
    src = source if source in ("link", "promo", "app", "mobile") else "link"
    cur.execute(
        f"INSERT INTO {SCHEMA}.referrals (inviter_id, friend_id, source, code) VALUES ({inviter}, {int(friend_id)}, '{src}', '{q(code)[:24]}') "
        f"ON CONFLICT (friend_id) DO NOTHING RETURNING id"
    )
    if not cur.fetchone():
        return False
    if st["friendBonusTka"] > 0:
        cur.execute(
            f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({int(friend_id)}, {st['friendBonusTka']}, 'bonus', 'Бонус за приход по приглашению')"
        )
    if st["trigger"] == "register":
        pay(cur, friend_id, st)
    return True


def pay(cur, friend_id: int, st=None) -> bool:
    st = st or settings(cur)
    if not st["enabled"]:
        return False
    cur.execute(
        f"UPDATE {SCHEMA}.referrals SET status = 'paid', rewarded_at = NOW(), reward_tka = {st['rewardTka']}, "
        f"reward_usdt = {st['rewardUsdt']}, fund_amount = {st['fundTka']} "
        f"WHERE friend_id = {int(friend_id)} AND status = 'pending' RETURNING inviter_id"
    )
    row = cur.fetchone()
    if not row:
        return False
    inviter = int(row[0])
    cur.execute(f"SELECT COALESCE(NULLIF(name, ''), split_part(email, '@', 1)) FROM {SCHEMA}.users WHERE id = {int(friend_id)}")
    name = q((cur.fetchone() or ["друг"])[0])[:40]
    if st["rewardTka"] > 0:
        cur.execute(
            f"INSERT INTO {SCHEMA}.tka_ledger (user_id, amount, kind, note) VALUES ({inviter}, {st['rewardTka']}, 'reward', 'Награда: друг {name}')"
        )
    if st["rewardUsdt"] > 0:
        cur.execute(f"INSERT INTO {SCHEMA}.paper_accounts (user_id, balance) VALUES ({inviter}, 0) ON CONFLICT (user_id) DO NOTHING")
        cur.execute(f"UPDATE {SCHEMA}.paper_accounts SET balance = balance + {st['rewardUsdt']} WHERE user_id = {inviter}")
        cur.execute(
            f"INSERT INTO {SCHEMA}.usdt_ledger (user_id, amount, kind, note) VALUES ({inviter}, {st['rewardUsdt']}, 'bonus', 'Награда: друг {name}')"
        )
    if st["fundTka"] > 0:
        cur.execute(
            f"INSERT INTO {SCHEMA}.fund_ledger (user_id, amount, kind, note) VALUES ({inviter}, {st['fundTka']}, 'deposit', 'Приведи друга: {name}')"
        )
    return True


def on_activity(cur, user_id: int) -> bool:
    cur.execute(f"SELECT 1 FROM {SCHEMA}.referrals WHERE friend_id = {int(user_id)} AND status = 'pending'")
    if not cur.fetchone():
        return False
    st = settings(cur)
    if st["trigger"] != "first_action":
        return False
    return pay(cur, user_id, st)


def my_state(cur, uid: int) -> dict:
    st = settings(cur)
    cur.execute(f"SELECT COALESCE(promo_code, '') FROM {SCHEMA}.users WHERE id = {int(uid)}")
    code = (cur.fetchone() or [""])[0]
    cur.execute(
        f"SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'paid'), COALESCE(SUM(reward_tka), 0), COALESCE(SUM(reward_usdt), 0) "
        f"FROM {SCHEMA}.referrals WHERE inviter_id = {int(uid)}"
    )
    a = cur.fetchone()
    cur.execute(
        f"SELECT r.status, r.source, r.created_at, r.reward_tka, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) "
        f"FROM {SCHEMA}.referrals r JOIN {SCHEMA}.users u ON u.id = r.friend_id WHERE r.inviter_id = {int(uid)} ORDER BY r.id DESC LIMIT 20"
    )
    friends = [{"status": r[0], "source": r[1], "at": r[2].isoformat(), "reward": float(r[3]), "name": r[4]} for r in cur.fetchall()]
    return {
        "settings": st,
        "code": code,
        "invited": int(a[0]),
        "paid": int(a[1]),
        "earnedTka": float(a[2]),
        "earnedUsdt": float(a[3]),
        "left": max(0, st["maxPerUser"] - int(a[0])) if st["maxPerUser"] else None,
        "friends": friends,
    }


def public_info(cur) -> dict:
    st = settings(cur)
    return {k: st[k] for k in ("enabled", "rewardTka", "rewardUsdt", "fundTka", "friendBonusTka", "trigger", "title", "text")}


def admin_state(cur) -> dict:
    st = settings(cur)
    cur.execute(
        f"SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'paid'), COUNT(*) FILTER (WHERE status = 'pending'), "
        f"COALESCE(SUM(reward_tka), 0), COALESCE(SUM(reward_usdt), 0), COALESCE(SUM(fund_amount), 0) FROM {SCHEMA}.referrals"
    )
    a = cur.fetchone()
    cur.execute(
        f"SELECT COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)), COUNT(*), COUNT(*) FILTER (WHERE r.status = 'paid') "
        f"FROM {SCHEMA}.referrals r JOIN {SCHEMA}.users u ON u.id = r.inviter_id GROUP BY u.id, u.name, u.email ORDER BY COUNT(*) DESC LIMIT 10"
    )
    top = [{"name": r[0], "invited": int(r[1]), "paid": int(r[2])} for r in cur.fetchall()]
    cur.execute(
        f"SELECT r.id, r.status, r.source, r.created_at, r.reward_tka, COALESCE(NULLIF(i.name, ''), split_part(i.email, '@', 1)), "
        f"COALESCE(NULLIF(f.name, ''), split_part(f.email, '@', 1)) FROM {SCHEMA}.referrals r "
        f"JOIN {SCHEMA}.users i ON i.id = r.inviter_id JOIN {SCHEMA}.users f ON f.id = r.friend_id ORDER BY r.id DESC LIMIT 20"
    )
    recent = [
        {"id": r[0], "status": r[1], "source": r[2], "at": r[3].isoformat(), "reward": float(r[4]), "inviter": r[5], "friend": r[6]}
        for r in cur.fetchall()
    ]
    return {
        "settings": st,
        "triggers": TRIGGERS,
        "stats": {"total": int(a[0]), "paid": int(a[1]), "pending": int(a[2]), "tka": float(a[3]), "usdt": float(a[4]), "fund": float(a[5])},
        "top": top,
        "recent": recent,
    }
