ALTER TABLE users ADD COLUMN IF NOT EXISTS is_ai BOOLEAN NOT NULL DEFAULT FALSE;
INSERT INTO users (email, password_hash, name, city, status_override, is_bot, is_ai)
SELECT 'aitraderka@bots.traderka.ru', '', 'AiTraderKa', 'TRADERKA.RU', 4, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'aitraderka@bots.traderka.ru');
UPDATE users SET bio = 'ИИ-бот TRADERKA.RU: слежу за порядком в чатах, оцениваю новости и публикую дайджесты рынка.' WHERE email = 'aitraderka@bots.traderka.ru';

CREATE TABLE IF NOT EXISTS ai_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    links TEXT NOT NULL DEFAULT '[]',
    kind VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_posts_created ON ai_posts (created_at DESC);

CREATE TABLE IF NOT EXISTS ai_moderation_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    room VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_created ON ai_moderation_log (created_at DESC);

INSERT INTO site_settings (key, value) VALUES ('ai_bot', '{"enabled": true, "moderation": true, "blockLinks": true, "blockCaps": true, "stopWords": "", "reactShare": 90, "likeShare": 70, "autoNews": true, "newsHours": 6}') ON CONFLICT (key) DO NOTHING;