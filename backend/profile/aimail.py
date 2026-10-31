import html
import json
import os
import smtplib
import ssl
import time
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
DEFAULT_MAIL = {"enabled": True, "daily": True, "digest": True, "fromName": "AiTKA", "subjectPrefix": "AiTKA"}
GOLD = 3


def esc(v: str) -> str:
    return v.replace("'", "''")


def load_mail(cur) -> dict:
    cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'ai_mail'")
    r = cur.fetchone()
    return {**DEFAULT_MAIL, **(json.loads(r[0]) if r else {})}


def smtp_ready() -> bool:
    return all(os.environ.get(k) for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"))


def enqueue_post(cur, post_id: int, kind: str) -> int:
    cfg = load_mail(cur)
    if not cfg.get("enabled"):
        return 0
    if kind == "daily" and not cfg.get("daily"):
        return 0
    if kind in ("auto", "manual") and not cfg.get("digest"):
        return 0
    cur.execute(
        f"INSERT INTO {SCHEMA}.ai_mail_queue (post_id, user_id, email) "
        f"SELECT {int(post_id)}, u.id, u.email FROM {SCHEMA}.subscriptions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.tier >= {GOLD} AND s.expires_at > NOW() AND s.mail_on AND NOT u.is_bot AND u.email LIKE '%@%' "
        f"AND u.email NOT LIKE '%@users.traderka.ru' AND u.email NOT LIKE '%@bots.traderka.ru' "
        f"ON CONFLICT (post_id, user_id) DO NOTHING"
    )
    return cur.rowcount or 0


def render(title: str, body: str, links: list, site: str) -> tuple:
    lines = [ln for ln in body.split("\n") if ln.strip()]
    rows = "".join(
        f'<tr><td style="padding:6px 0;color:#e5e7eb;font-size:15px;line-height:1.5">{html.escape(ln)}</td></tr>' for ln in lines
    )
    link_html = "".join(
        f'<div style="margin-top:6px"><a href="{html.escape(l["url"])}" style="color:#38bdf8;font-size:13px;text-decoration:none">{html.escape(l["title"])}</a></div>'
        for l in links[:5]
        if str(l.get("url", "")).startswith("http")
    )
    page = (
        '<div style="background:#0f1115;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">'
        '<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#1a1d24;border-radius:12px;padding:24px">'
        '<tr><td style="color:#a5b4fc;font-size:12px;letter-spacing:1px;text-transform:uppercase">AiTKA · рассылка для подписчиков «Золото»</td></tr>'
        f'<tr><td style="color:#ffffff;font-size:22px;font-weight:bold;padding:10px 0 12px">{html.escape(title)}</td></tr>'
        f"{rows}"
        f'<tr><td>{link_html}</td></tr>'
        f'<tr><td style="padding-top:20px"><a href="{html.escape(site)}" style="color:#ffffff;background:#6366f1;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Открыть TRADERKA.RU</a></td></tr>'
        '<tr><td style="color:#6b7280;font-size:11px;padding-top:20px">Вы получаете это письмо, потому что у вас активна подписка «Золото». '
        "Отключить рассылку можно в личном кабинете.</td></tr></table></div>"
    )
    text = title + "\n\n" + body + "\n\n" + "\n".join(f'{l["title"]}: {l["url"]}' for l in links[:5]) + f"\n\n{site}"
    return text, page


def process_queue(cur, limit: int = 8, budget: float = 3.2) -> dict:
    cfg = load_mail(cur)
    out = {"sent": 0, "failed": 0, "left": 0, "configured": smtp_ready()}
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.ai_mail_queue WHERE status = 'pending'")
    out["left"] = int(cur.fetchone()[0])
    if not smtp_ready() or not cfg.get("enabled") or out["left"] == 0:
        return out
    started = time.time()
    cur.execute(
        f"SELECT q.id, q.email, p.title, p.body, p.links FROM {SCHEMA}.ai_mail_queue q JOIN {SCHEMA}.ai_posts p ON p.id = q.post_id "
        f"WHERE q.status = 'pending' AND q.attempts < 3 ORDER BY q.id LIMIT {int(limit)}"
    )
    rows = cur.fetchall()
    if not rows:
        return out
    host, port = os.environ["SMTP_HOST"], int(os.environ.get("SMTP_PORT") or 465)
    user, pwd = os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"]
    sender = os.environ.get("SMTP_FROM") or user
    site = os.environ.get("SITE_URL") or "https://traderka.ru"
    try:
        if port == 465:
            srv = smtplib.SMTP_SSL(host, port, timeout=6, context=ssl.create_default_context())
        else:
            srv = smtplib.SMTP(host, port, timeout=6)
            srv.starttls(context=ssl.create_default_context())
        srv.login(user, pwd)
    except Exception as e:
        err = esc(f"Не удалось подключиться к почте: {e}"[:290])
        cur.execute(f"UPDATE {SCHEMA}.ai_mail_queue SET attempts = attempts + 1, error = '{err}' WHERE id IN ({', '.join(str(r[0]) for r in rows)})")
        out["failed"] = len(rows)
        out["error"] = str(e)[:200]
        return out
    try:
        for qid, email, title, body, links in rows:
            if time.time() - started > budget:
                break
            try:
                text, page = render(title, body, json.loads(links or "[]"), site)
                msg = MIMEMultipart("alternative")
                msg["Subject"] = Header(f"{cfg.get('subjectPrefix', 'AiTKA')}: {title}", "utf-8")
                msg["From"] = formataddr((str(Header(cfg.get("fromName", "AiTKA"), "utf-8")), sender))
                msg["To"] = email
                msg.attach(MIMEText(text, "plain", "utf-8"))
                msg.attach(MIMEText(page, "html", "utf-8"))
                srv.sendmail(sender, [email], msg.as_string())
                cur.execute(f"UPDATE {SCHEMA}.ai_mail_queue SET status = 'sent', sent_at = NOW(), error = '' WHERE id = {qid}")
                out["sent"] += 1
            except Exception as e:
                cur.execute(
                    f"UPDATE {SCHEMA}.ai_mail_queue SET attempts = attempts + 1, error = '{esc(str(e)[:290])}', "
                    f"status = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'pending' END WHERE id = {qid}"
                )
                out["failed"] += 1
    finally:
        try:
            srv.quit()
        except Exception:
            pass
    out["left"] = max(0, out["left"] - out["sent"])
    return out


def mail_stats(cur) -> dict:
    cur.execute(f"SELECT status, COUNT(*) FROM {SCHEMA}.ai_mail_queue GROUP BY status")
    c = {r[0]: int(r[1]) for r in cur.fetchall()}
    cur.execute(
        f"SELECT COUNT(*), COUNT(*) FILTER (WHERE s.mail_on) FROM {SCHEMA}.subscriptions s WHERE s.tier >= {GOLD} AND s.expires_at > NOW()"
    )
    g = cur.fetchone()
    cur.execute(
        f"SELECT q.id, q.email, q.status, q.error, q.created_at, q.sent_at, p.title FROM {SCHEMA}.ai_mail_queue q "
        f"JOIN {SCHEMA}.ai_posts p ON p.id = q.post_id ORDER BY q.id DESC LIMIT 30"
    )
    log = [{"id": x[0], "email": x[1], "status": x[2], "error": x[3], "createdAt": x[4].isoformat(),
            "sentAt": x[5].isoformat() if x[5] else None, "title": x[6]} for x in cur.fetchall()]
    return {
        "sent": c.get("sent", 0), "pending": c.get("pending", 0), "failed": c.get("failed", 0),
        "gold": int(g[0]), "goldMailOn": int(g[1]), "configured": smtp_ready(), "log": log,
    }
