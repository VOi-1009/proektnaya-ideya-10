import io
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONTS = os.path.join(os.path.dirname(__file__), "fonts")
UP = (34, 197, 94)
DOWN = (234, 57, 67)
BRAND = (249, 115, 22)
MUTED = (138, 143, 152)


def font(name: str, size: int):
    return ImageFont.truetype(os.path.join(FONTS, f"OpenSans-{name}.ttf"), size)


def render_move_card(name: str, short: str, color: str, change_text: str, price_text: str, up: bool, date_text: str) -> bytes:
    w, h = 1200, 630
    main = UP if up else DOWN
    img = Image.new("RGB", (w, h), (22, 23, 27))
    d = ImageDraw.Draw(img, "RGBA")
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((w - 620, -300, w + 200, 520), fill=main + (70,))
    glow = glow.filter(ImageFilter.GaussianBlur(140))
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle((0, 0, 14, h), fill=main)

    f = font("Bold", 30)
    x = 70
    for part, col in (("TRADER", (255, 255, 255)), ("KA", BRAND), (".RU", (255, 255, 255))):
        d.text((x, 78), part, font=f, fill=col, anchor="ls")
        x += d.textlength(part, font=f)
    d.text((x + 20, 78), "Резкое движение рынка", font=font("Regular", 24), fill=MUTED, anchor="ls")

    rgb = tuple(int(color.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    d.ellipse((70, 152, 166, 248), fill=rgb)
    d.text((118, 201), short[:5], font=font("Bold", 24 if len(short) > 3 else 30), fill=(255, 255, 255), anchor="mm")
    d.text((188, 198), name, font=font("Bold", 52), fill=(255, 255, 255), anchor="ls")

    tag = "РОСТ ЗА 24 ЧАСА" if up else "ПАДЕНИЕ ЗА 24 ЧАСА"
    tf = font("Bold", 26)
    tw = d.textlength(tag, font=tf) + 40
    tint = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(tint).rounded_rectangle((190, 214, 190 + tw, 260), radius=12, fill=main + (46,))
    img = Image.alpha_composite(img, tint)
    d = ImageDraw.Draw(img)
    d.text((210, 247), tag, font=tf, fill=main, anchor="ls")

    d.text((66, 440), change_text, font=font("ExtraBold", 150), fill=main, anchor="ls")
    d.text((72, 490), f"Сейчас около {price_text}", font=font("Regular", 34), fill=(180, 184, 192), anchor="ls")
    d.rectangle((70, 520, w - 70, 521), fill=(48, 49, 53))
    d.text((72, 590), "Не является инвестиционной рекомендацией", font=font("Regular", 22), fill=MUTED, anchor="ls")
    d.text((w - 70, 590), date_text, font=font("Regular", 22), fill=(107, 112, 121), anchor="rs")

    out = io.BytesIO()
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out.getvalue()
