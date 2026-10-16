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


def resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(body, ensure_ascii=False, default=str)}


def esc(v: str) -> str:
    return v.replace("'", "''")


def row_to_article(r, full: bool) -> dict:
    a = {
        "id": r[0],
        "title": r[1],
        "summary": r[2],
        "cover": r[4] or "",
        "published": r[5],
        "author": r[6] or "Редакция",
        "createdAt": r[7].isoformat(),
        "updatedAt": r[8].isoformat(),
        "categoryId": r[9],
        "category": r[10] or "",
    }
    if full:
        a["content"] = r[3]
    return a


SELECT = "SELECT a.id, a.title, a.summary, a.content, a.cover_url, a.published, u.name, a.created_at, a.updated_at, a.category_id, c.name FROM {s}.articles a LEFT JOIN {s}.users u ON u.id = a.author_id LEFT JOIN {s}.article_categories c ON c.id = a.category_id"


def upload_cover(body: dict) -> str | None:
    data = body.get("coverData")
    if not data:
        return None
    ctype = str(body.get("coverType", ""))
    if ctype not in IMAGE_TYPES:
        raise ValueError("Обложка: подойдёт JPG, PNG или WEBP")
    raw = base64.b64decode(str(data).split(",")[-1])
    if len(raw) > 4 * 1024 * 1024:
        raise ValueError("Обложка должна быть до 4 МБ")
    key = f"articles/{uuid.uuid4().hex}.{IMAGE_TYPES[ctype]}"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=ctype)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handle_articles(event: dict) -> dict:
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

        base = SELECT.format(s=SCHEMA)

        if method == "GET":
            if qs.get("admin") == "check":
                return resp(200, {"admin": admin_id is not None})
            aid = str(qs.get("id", ""))
            if aid.isdigit():
                where = "" if admin_id else " AND a.published = TRUE"
                cur.execute(f"{base} WHERE a.id = {int(aid)}{where}")
                r = cur.fetchone()
                if not r:
                    return resp(404, {"error": "Статья не найдена"})
                return resp(200, {"article": row_to_article(r, True)})
            if qs.get("categories") == "1":
                cur.execute(
                    f"SELECT c.id, c.name, c.sort_order, (SELECT COUNT(*) FROM {SCHEMA}.articles a WHERE a.category_id = c.id AND a.published = TRUE) "
                    f"FROM {SCHEMA}.article_categories c ORDER BY c.sort_order, c.id"
                )
                return resp(200, {"categories": [{"id": r[0], "name": r[1], "sort": r[2], "count": int(r[3])} for r in cur.fetchall()]})
            show_all = qs.get("all") == "1" and admin_id
            conds = [] if show_all else ["a.published = TRUE"]
            cat = str(qs.get("category", ""))
            if cat.isdigit():
                conds.append(f"a.category_id = {int(cat)}")
            limit = str(qs.get("limit", ""))
            limit_n = min(int(limit), 200) if limit.isdigit() and int(limit) > 0 else 200
            where = f" WHERE {' AND '.join(conds)}" if conds else ""
            cur.execute(f"{base}{where} ORDER BY a.created_at DESC LIMIT {limit_n}")
            return resp(200, {"articles": [row_to_article(r, False) for r in cur.fetchall()]})

        if method != "POST":
            return resp(405, {"error": "Метод не поддерживается"})
        if not admin_id:
            return resp(403, {"error": "Доступ только для администратора"})

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "category-save":
            name = str(body.get("name", "")).strip()[:60]
            if len(name) < 2:
                return resp(400, {"error": "Название рубрики слишком короткое"})
            sort = int(body.get("sort", 0) or 0)
            cid = int(body.get("id", 0) or 0)
            if cid:
                cur.execute(f"UPDATE {SCHEMA}.article_categories SET name = '{esc(name)}', sort_order = {sort} WHERE id = {cid}")
            else:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.article_categories (name, sort_order) VALUES ('{esc(name)}', "
                    f"COALESCE((SELECT MAX(sort_order) FROM {SCHEMA}.article_categories), 0) + 1)"
                )
            return resp(200, {"ok": True})

        if action == "category-delete":
            cid = int(body.get("id", 0) or 0)
            cur.execute(f"UPDATE {SCHEMA}.articles SET category_id = NULL WHERE category_id = {cid}")
            cur.execute(f"DELETE FROM {SCHEMA}.article_categories WHERE id = {cid}")
            return resp(200, {"ok": True})

        if action == "delete":
            cur.execute(f"DELETE FROM {SCHEMA}.articles WHERE id = {int(body.get('id', 0))}")
            return resp(200, {"ok": True})

        if action not in ("create", "update"):
            return resp(400, {"error": "Неизвестное действие"})

        title = str(body.get("title", "")).strip()[:200]
        summary = str(body.get("summary", "")).strip()[:500]
        content = str(body.get("content", "")).strip()[:100000]
        published = "TRUE" if body.get("published", True) else "FALSE"
        if len(title) < 3:
            return resp(400, {"error": "Заголовок слишком короткий"})
        if len(content) < 10:
            return resp(400, {"error": "Добавьте текст статьи"})
        try:
            cover = upload_cover(body)
        except ValueError as e:
            return resp(400, {"error": str(e)})
        remove_cover = bool(body.get("removeCover"))
        cat_raw = body.get("categoryId")
        cat_sql = str(int(cat_raw)) if str(cat_raw or "").isdigit() and int(cat_raw) > 0 else "NULL"

        if action == "create":
            cover_sql = f"'{esc(cover)}'" if cover else "NULL"
            cur.execute(
                f"INSERT INTO {SCHEMA}.articles (title, summary, content, cover_url, published, author_id, category_id) "
                f"VALUES ('{esc(title)}', '{esc(summary)}', '{esc(content)}', {cover_sql}, {published}, {admin_id}, {cat_sql}) RETURNING id"
            )
            new_id = cur.fetchone()[0]
        else:
            new_id = int(body.get("id", 0))
            cover_set = f", cover_url = '{esc(cover)}'" if cover else (", cover_url = NULL" if remove_cover else "")
            cur.execute(
                f"UPDATE {SCHEMA}.articles SET title = '{esc(title)}', summary = '{esc(summary)}', content = '{esc(content)}', "
                f"published = {published}, category_id = {cat_sql}, updated_at = NOW(){cover_set} WHERE id = {new_id}"
            )
        cur.execute(f"{base} WHERE a.id = {new_id}")
        return resp(200, {"article": row_to_article(cur.fetchone(), True)})
    finally:
        cur.close()
        conn.close()
