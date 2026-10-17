import base64
import json
import os
import re
import uuid

import boto3
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
COLS = "id, title, left_text, left_image, right_text, right_image, sort_order, published"


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def row_to_block(r) -> dict:
    return {
        "id": r[0],
        "title": r[1] or "",
        "leftText": r[2] or "",
        "leftImage": r[3] or "",
        "rightText": r[4] or "",
        "rightImage": r[5] or "",
        "sort": r[6],
        "published": r[7],
    }


def upload_image(data: str, ctype: str) -> str:
    if ctype not in IMAGE_TYPES:
        raise ValueError("Картинка: подойдёт JPG, PNG или WEBP")
    raw = base64.b64decode(str(data).split(",")[-1])
    if len(raw) > 4 * 1024 * 1024:
        raise ValueError("Картинка должна быть до 4 МБ")
    key = f"home-blocks/{uuid.uuid4().hex}.{IMAGE_TYPES[ctype]}"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=ctype)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def image_sql(body: dict, side: str) -> str | None:
    data = body.get(f"{side}ImageData")
    if data:
        return f"'{esc(upload_image(data, str(body.get(f'{side}ImageType', ''))))}'"
    if body.get(f"{side}ImageRemove"):
        return "NULL"
    return None


def handle_blocks(event: dict) -> dict:
    method = event.get("httpMethod", "GET")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = re.sub(r"[^a-f0-9]", "", headers.get("x-auth-token", ""))
    qs = event.get("queryStringParameters") or {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        admin_id = None
        if token:
            cur.execute(
                f"SELECT u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = '{token}' AND s.expires_at > NOW() AND u.is_admin = TRUE"
            )
            r = cur.fetchone()
            admin_id = int(r[0]) if r else None

        if method == "GET":
            where = "" if (qs.get("all") == "1" and admin_id) else " WHERE published = TRUE"
            cur.execute(f"SELECT {COLS} FROM {SCHEMA}.home_blocks{where} ORDER BY sort_order, id")
            return resp(200, {"blocks": [row_to_block(r) for r in cur.fetchall()]})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not admin_id:
            return resp(403, {"error": "Доступ только для администратора"})

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "delete":
            cur.execute(f"DELETE FROM {SCHEMA}.home_blocks WHERE id = {int(body.get('id', 0))}")
            return resp(200, {"ok": True})

        if action == "move":
            bid = int(body.get("id", 0))
            direction = -1 if body.get("dir") == "up" else 1
            cur.execute(f"SELECT id FROM {SCHEMA}.home_blocks ORDER BY sort_order, id")
            ids = [r[0] for r in cur.fetchall()]
            if bid in ids:
                i = ids.index(bid)
                j = i + direction
                if 0 <= j < len(ids):
                    ids[i], ids[j] = ids[j], ids[i]
                for n, x in enumerate(ids):
                    cur.execute(f"UPDATE {SCHEMA}.home_blocks SET sort_order = {n} WHERE id = {x}")
            return resp(200, {"ok": True})

        if action != "save":
            return resp(400, {"error": "Неизвестное действие"})

        title = str(body.get("title", "")).strip()[:200]
        left_text = str(body.get("leftText", "")).strip()[:20000]
        right_text = str(body.get("rightText", "")).strip()[:20000]
        published = "TRUE" if body.get("published", True) else "FALSE"
        try:
            left_img = image_sql(body, "left")
            right_img = image_sql(body, "right")
        except ValueError as e:
            return resp(400, {"error": str(e)})

        bid = int(body.get("id", 0) or 0)
        if bid:
            extra = ""
            if left_img is not None:
                extra += f", left_image = {left_img}"
            if right_img is not None:
                extra += f", right_image = {right_img}"
            cur.execute(
                f"UPDATE {SCHEMA}.home_blocks SET title = '{esc(title)}', left_text = '{esc(left_text)}', right_text = '{esc(right_text)}', "
                f"published = {published}, updated_at = NOW(){extra} WHERE id = {bid} RETURNING {COLS}"
            )
        else:
            if not (left_text or right_text or left_img or right_img):
                return resp(400, {"error": "Добавьте текст или картинку"})
            cur.execute(
                f"INSERT INTO {SCHEMA}.home_blocks (title, left_text, left_image, right_text, right_image, published, sort_order) "
                f"VALUES ('{esc(title)}', '{esc(left_text)}', {left_img or 'NULL'}, '{esc(right_text)}', {right_img or 'NULL'}, {published}, "
                f"COALESCE((SELECT MAX(sort_order) FROM {SCHEMA}.home_blocks), 0) + 1) RETURNING {COLS}"
            )
        r = cur.fetchone()
        if not r:
            return resp(404, {"error": "Блок не найден"})
        return resp(200, {"block": row_to_block(r)})
    finally:
        cur.close()
        conn.close()
