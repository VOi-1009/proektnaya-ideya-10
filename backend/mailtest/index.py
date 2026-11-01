import json
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.header import Header

TO = "baagold@yandex.ru"


def handler(event: dict, context) -> dict:
    """Временная проверка почты: отправляет одно тестовое письмо и возвращает результат"""
    h = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {**h, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400"}, "body": ""}
    host = os.environ.get("SMTP_HOST", "")
    port = int(os.environ.get("SMTP_PORT") or 465)
    user = os.environ.get("SMTP_USER", "")
    pwd = os.environ.get("SMTP_PASSWORD", "")
    if not (host and user and pwd):
        return {"statusCode": 200, "headers": h, "body": json.dumps({"ok": False, "step": "config", "error": "Не заполнены настройки почты"})}
    step = "connect"
    try:
        if port == 465:
            srv = smtplib.SMTP_SSL(host, port, timeout=8, context=ssl.create_default_context())
        else:
            srv = smtplib.SMTP(host, port, timeout=8)
            srv.starttls(context=ssl.create_default_context())
        step = "login"
        srv.login(user, pwd)
        step = "send"
        msg = MIMEText("Тестовое письмо с сайта TRADERKA.RU. Если вы его видите, почта настроена верно.", "plain", "utf-8")
        msg["Subject"] = Header("Тест почты TRADERKA.RU", "utf-8")
        msg["From"] = user
        msg["To"] = TO
        srv.sendmail(user, [TO], msg.as_string())
        srv.quit()
    except Exception as e:
        return {"statusCode": 200, "headers": h, "body": json.dumps({"ok": False, "step": step, "host": host, "port": port, "error": str(e)[:300]})}
    return {"statusCode": 200, "headers": h, "body": json.dumps({"ok": True, "to": TO, "host": host, "port": port})}
