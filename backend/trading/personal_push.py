import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, wait

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
SITE = os.environ.get("SITE_URL") or "https://traderka.ru"

COIN_RU = {
    "bitcoin": "Bitcoin", "ethereum": "Ethereum", "binancecoin": "BNB", "ripple": "XRP", "solana": "Solana",
    "dogecoin": "Dogecoin", "hyperliquid": "Hyperliquid", "zcash": "Zcash", "tron": "TRON", "cardano": "Cardano",
    "chainlink": "Chainlink", "stellar": "Stellar", "avalanche-2": "Avalanche", "sui": "Sui", "shiba-inu": "Shiba Inu",
    "the-open-network": "Gram", "hedera-hashgraph": "Hedera", "litecoin": "Litecoin",
}
HEAD = {"take": "Тейк-профит", "stop": "Стоп-лосс", "liquidation": "Ликвидация"}


def esc(v) -> str:
    return str(v).replace("'", "''").replace("\\", "")


def fmt_px(v) -> str:
    v = float(v)
    if v >= 1000:
        return f"${v:,.0f}".replace(",", " ")
    if v >= 1:
        return f"${v:,.2f}".replace(",", " ").replace(".", ",")
    return f"${v:.5f}".replace(".", ",")


def money(v: float) -> str:
    sign = "+" if v > 0 else "−" if v < 0 else ""
    return f"{sign}{abs(v):.2f}".replace(".", ",")


def settings(cur) -> dict:
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'ai_push'")
    r = cur.fetchone()
    try:
        raw = json.loads(r[0]) if r and r[0] else {}
    except ValueError:
        raw = {}
    return {k: bool(raw.get(k, True)) for k in ("enabled", "trades", "alerts")}


def private_key(cur) -> str:
    env = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    if env:
        return env
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'push_vapid'")
    r = cur.fetchone()
    try:
        return str(json.loads(r[0]).get("private", "")) if r and r[0] else ""
    except ValueError:
        return ""


def send_one(sub: dict, payload: str, key: str):
    from pywebpush import webpush

    try:
        webpush(
            subscription_info={"endpoint": sub["endpoint"], "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]}},
            data=payload,
            vapid_private_key=key,
            vapid_claims={"sub": SITE},
            timeout=3,
            ttl=3600,
        )
        return sub["id"], "ok"
    except Exception as e:
        code = getattr(getattr(e, "response", None), "status_code", 0)
        return sub["id"], "gone" if code in (404, 410) else "fail"


def send_to_user(cur, uid: int, kind: str, title: str, body: str, url: str, ref: str) -> int:
    st = settings(cur)
    if not st["enabled"] or not st.get(kind, True):
        return 0
    cur.execute(f"SELECT id, endpoint, p256dh, auth FROM {SCHEMA}.push_subscriptions WHERE user_id = {int(uid)} LIMIT 5")
    subs = [{"id": r[0], "endpoint": r[1], "p256dh": r[2], "auth": r[3]} for r in cur.fetchall()]
    if not subs:
        return 0
    key = private_key(cur)
    if not key:
        return 0
    cur.execute(f"INSERT INTO {SCHEMA}.push_sent (user_id, ref) VALUES ({int(uid)}, '{esc(ref)}') ON CONFLICT DO NOTHING RETURNING ref")
    if not cur.fetchone():
        return 0
    payload = json.dumps({"title": title[:120], "body": body[:400], "url": url}, ensure_ascii=False)
    ex = ThreadPoolExecutor(max_workers=5)
    try:
        futs = [ex.submit(send_one, s, payload, key) for s in subs]
        done, _ = wait(futs, timeout=2.5)
        results = [f.result() for f in done]
    finally:
        ex.shutdown(wait=False, cancel_futures=True)
    sent = 0
    for sid, status in results:
        if status == "ok":
            sent += 1
        elif status == "gone":
            cur.execute(f"DELETE FROM {SCHEMA}.push_queue WHERE sub_id = {int(sid)}")
            cur.execute(f"DELETE FROM {SCHEMA}.push_subscriptions WHERE id = {int(sid)}")
    if sent == 0:
        cur.execute(f"DELETE FROM {SCHEMA}.push_sent WHERE user_id = {int(uid)} AND ref = '{esc(ref)}'")
    return sent


def closed_text(row) -> tuple:
    coin, side, lev, margin, entry, close, pnl, reason = row
    name = COIN_RU.get(coin, coin)
    margin, pnl = float(margin or 0), float(pnl or 0)
    pct = pnl / margin * 100 if margin else 0.0
    title = f"{HEAD.get(reason, 'Сделка закрыта')}: {name} {money(pnl)} USDT"
    body = (
        f"{'Лонг' if side == 'long' else 'Шорт'} {name} x{lev}: вход {fmt_px(entry)}, выход {fmt_px(close)}. "
        f"Результат {money(pnl)} USDT ({money(pct)}% от суммы сделки). Это виртуальные деньги."
    )
    return title, body


def notify_closed(cur, uid: int, t_end: float) -> int:
    cur.execute(
        f"SELECT p.id, p.coin_id, p.side, p.leverage, p.margin, p.entry_price, p.close_price, p.pnl, p.close_reason "
        f"FROM {SCHEMA}.paper_positions p JOIN {SCHEMA}.users u ON u.id = p.user_id "
        f"WHERE p.user_id = {int(uid)} AND p.status = 'closed' AND p.close_reason IN ('stop', 'take', 'liquidation') "
        f"AND p.closed_at > NOW() - INTERVAL '10 minutes' "
        f"AND EXISTS (SELECT 1 FROM {SCHEMA}.push_subscriptions ps WHERE ps.user_id = p.user_id) "
        f"AND NOT EXISTS (SELECT 1 FROM {SCHEMA}.push_sent s WHERE s.user_id = p.user_id AND s.ref = 'pos:' || p.id::text) "
        f"AND (u.last_seen_at IS NULL OR u.last_seen_at < p.closed_at - INTERVAL '90 seconds') "
        f"ORDER BY p.id LIMIT 5"
    )
    n = 0
    for r in cur.fetchall():
        if time.time() > t_end:
            break
        title, body = closed_text(r[1:])
        n += 1 if send_to_user(cur, uid, "trades", title, body, "/m", f"pos:{r[0]}") else 0
    return n


def alert_text(coin: str, direction: str, target: float, price: float) -> tuple:
    name = COIN_RU.get(coin, coin)
    verb = "поднялся до" if direction == "above" else "опустился до"
    return f"Цель достигнута: {name}", f"{name} {verb} {fmt_px(target)}, сейчас {fmt_px(price)}."


def check_price_alerts(cur, px: dict, t_end: float) -> int:
    cur.execute(
        f"SELECT p.user_id, p.value FROM {SCHEMA}.user_prefs p WHERE p.key = 'alerts' "
        f"AND p.user_id IN (SELECT user_id FROM {SCHEMA}.push_subscriptions WHERE user_id IS NOT NULL)"
    )
    total = 0
    for uid, raw in cur.fetchall():
        if time.time() > t_end:
            break
        try:
            alerts = json.loads(raw)
        except ValueError:
            continue
        if not isinstance(alerts, list):
            continue
        changed = False
        for a in alerts:
            if not isinstance(a, dict) or a.get("triggeredAt"):
                continue
            coin, target = a.get("coinId"), a.get("target")
            price = px.get(coin)
            if not price or not isinstance(target, (int, float)) or a.get("direction") not in ("above", "below"):
                continue
            hit = price >= target if a["direction"] == "above" else price <= target
            if not hit:
                continue
            title, body = alert_text(coin, a["direction"], target, price)
            if send_to_user(cur, int(uid), "alerts", title, body, "/m", f"alert:{str(a.get('id', ''))[:60]}"):
                a["triggeredAt"] = int(time.time() * 1000)
                a["triggeredPrice"] = price
                changed = True
                total += 1
        if changed:
            new = json.dumps(alerts, ensure_ascii=False)
            cur.execute(
                f"UPDATE {SCHEMA}.user_prefs SET value = '{new.replace(chr(39), chr(39) * 2)}', updated_at = NOW() "
                f"WHERE user_id = {int(uid)} AND key = 'alerts' AND value = '{raw.replace(chr(39), chr(39) * 2)}'"
            )
    return total
