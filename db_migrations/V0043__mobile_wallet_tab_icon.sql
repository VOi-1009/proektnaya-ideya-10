UPDATE site_settings
SET value = replace(value, '"label": "Кошелек", "icon": "UserRound"', '"label": "Кошелек", "icon": "Wallet"'),
    updated_at = NOW()
WHERE key = 'mobile_settings' AND value LIKE '%"label": "Кошелек", "icon": "UserRound"%';
