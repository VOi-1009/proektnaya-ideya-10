UPDATE site_settings
SET value = replace(replace(value,
      '"label": "Магазин", "icon": "Newspaper"', '"label": "Магазин", "icon": "ShoppingCart"'),
      '"label": "TRADE", "icon": "Gamepad2"', '"label": "TRADE", "icon": "CandlestickChart"'),
    updated_at = NOW()
WHERE key = 'mobile_settings';
