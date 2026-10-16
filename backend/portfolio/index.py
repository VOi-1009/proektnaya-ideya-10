import json
import os
import re

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
COIN_RE = re.compile(r"^[a-z0-9-]{1,64}$")


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(body, ensure_ascii=False)}


def rows_to_list(rows) -> list:
    return [{"id": str(r[0]), "coinId": r[1], "amount": float(r[2]), "buyPrice": float(r[3])} for r in rows]


def handler(event: dict, context) -> dict:
    """Портфель пользователя: список монет, добавление (в т.ч. пакетное) и удаление позиций"""
    method = event.get("httpMethod", "GET")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    if not token:
        return resp(401, {"error": "Войдите, чтобы работать с портфелем"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = '{token}' AND expires_at > NOW()")
        row = cur.fetchone()
        if not row:
            return resp(401, {"error": "Сессия истекла, войдите снова"})
        user_id = int(row[0])

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            items = body.get("items") if isinstance(body.get("items"), list) else [body]
            values = []
            for it in items[:200]:
                coin = str(it.get("coinId", ""))
                try:
                    amount = float(it.get("amount"))
                    price = float(it.get("buyPrice"))
                except (TypeError, ValueError):
                    return resp(400, {"error": "Некорректное количество или цена"})
                if not COIN_RE.match(coin) or amount <= 0 or price <= 0:
                    return resp(400, {"error": "Некорректные данные позиции"})
                values.append(f"({user_id}, '{coin}', {amount!r}, {price!r})")
            if values:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.holdings (user_id, coin_id, amount, buy_price) VALUES {', '.join(values)}"
                )
        elif method == "DELETE":
            hid = (event.get("queryStringParameters") or {}).get("id", "")
            if not str(hid).isdigit():
                return resp(400, {"error": "Не указана позиция"})
            cur.execute(f"DELETE FROM {SCHEMA}.holdings WHERE id = {int(hid)} AND user_id = {user_id}")
        elif method != "GET":
            return resp(405, {"error": "Метод не поддерживается"})

        cur.execute(
            f"SELECT id, coin_id, amount, buy_price FROM {SCHEMA}.holdings WHERE user_id = {user_id} ORDER BY created_at, id"
        )
        return resp(200, {"holdings": rows_to_list(cur.fetchall())})
    finally:
        cur.close()
        conn.close()
