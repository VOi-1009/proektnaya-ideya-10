UPDATE users SET is_verified = TRUE WHERE id = 2 AND email = 'baagold@yandex.ru';
ALTER TABLE paper_orders ADD COLUMN IF NOT EXISTS fee NUMERIC(20,6) NOT NULL DEFAULT 0;
