UPDATE site_settings
SET value = replace(value, '{"id": "trading", "label": "тренинг-биржа", "hidden": false', '{"id": "trading", "label": "тренинг-биржа", "hidden": true'),
    updated_at = NOW()
WHERE key = 'menu' AND value LIKE '%{"id": "trading", "label": "тренинг-биржа", "hidden": false%';
