import json
import os
import re

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
LIMITS = {"my_coins": 600, "alerts": 20000, "lang": 8, "seen_news": 200, "install_dismissed": 8}
COINS = {
    "bitcoin", "ethereum", "binancecoin", "ripple", "solana", "dogecoin", "hyperliquid", "zcash", "tron", "cardano",
    "chainlink", "stellar", "avalanche-2", "sui", "shiba-inu", "the-open-network", "hedera-hashgraph", "litecoin",
}


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return str(v).replace("'", "''").replace("\\", "")


def clean(key: str, value: str):
    if key not in LIMITS or len(value) > LIMITS[key]:
        return None
    if key == "lang":
        return value if value in ("ru", "en") else None
    if key == "install_dismissed":
        return value if value in ("0", "1") else None
    try:
        data = json.loads(value)
    except ValueError:
        return None
    if key == "my_coins":
        if not isinstance(data, list):
            return None
        out = []
        for c in data:
            if isinstance(c, str) and c in COINS and c not in ("bitcoin", "ethereum") and c not in out:
                out.append(c)
        return json.dumps(out[:4])
    if key == "alerts":
        if not isinstance(data, list):
            return None
        return json.dumps(data[:100], ensure_ascii=False)
    if key == "seen_news":
        if not isinstance(data, dict):
            return None
        return json.dumps({str(k)[:20]: int(v) for k, v in list(data.items())[:6] if isinstance(v, (int, float))})
    return None


def handle_prefs(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    if not token:
        return resp(401, {"error": "Войдите в аккаунт"})
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute(
            f"SELECT u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
            f"WHERE s.token = '{token}' AND s.expires_at > NOW()"
        )
        row = cur.fetchone()
        if not row:
            return resp(401, {"error": "Войдите в аккаунт"})
        me = int(row[0])

        if method == "GET":
            cur.execute(f"SELECT key, value FROM {SCHEMA}.user_prefs WHERE user_id = {me}")
            return resp(200, {"prefs": {k: v for k, v in cur.fetchall()}})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        body = json.loads(event.get("body") or "{}")
        key = str(body.get("key", ""))
        value = body.get("value")
        value = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
        ok = clean(key, value)
        if ok is None:
            return resp(400, {"error": "Недопустимая настройка"})
        cur.execute(
            f"INSERT INTO {SCHEMA}.user_prefs (user_id, key, value, updated_at) VALUES ({me}, '{esc(key)}', '{esc(ok)}', NOW()) "
            f"ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
        )
        return resp(200, {"ok": True, "value": ok})
    finally:
        cur.close()
        conn.close()

