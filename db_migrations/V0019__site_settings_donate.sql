CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO site_settings (key, value) VALUES ('donate', '{"enabled": true, "buttonText": "Поддержать проект", "title": "Поддержать TRADERKA.RU", "text": "Проект развивается на энтузиазме. Если сайт вам полезен — поддержите его любой суммой: это помогает оплачивать серверы и добавлять новые функции. Спасибо!", "url": "https://finance.ozon.ru/apps/sbp/ozonbankpay/1e0fb496-1d6c-4130-8565-2967281bbc17", "details": ""}') ON CONFLICT (key) DO NOTHING;