CREATE TABLE IF NOT EXISTS subscriptions (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    tier INTEGER NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    mail_on BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions (expires_at);

CREATE TABLE IF NOT EXISTS subscription_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    tier INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON subscription_requests (status, id DESC);

CREATE TABLE IF NOT EXISTS forum_sections (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(300) NOT NULL DEFAULT '',
    sort INTEGER NOT NULL DEFAULT 0,
    guests_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_plan INTEGER NOT NULL DEFAULT 2,
    read_level INTEGER NOT NULL DEFAULT 1,
    topic_plan INTEGER NOT NULL DEFAULT 2,
    topic_level INTEGER NOT NULL DEFAULT 1,
    reply_plan INTEGER NOT NULL DEFAULT 2,
    reply_level INTEGER NOT NULL DEFAULT 1,
    allow_users TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_topics (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    posts_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_post_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_topics_section ON forum_topics (section_id, pinned DESC, last_post_at DESC);

CREATE TABLE IF NOT EXISTS forum_posts (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic ON forum_posts (topic_id, id);

CREATE TABLE IF NOT EXISTS ai_mail_queue (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error VARCHAR(300) NOT NULL DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP,
    UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_mail_queue_status ON ai_mail_queue (status, id);

INSERT INTO site_settings (key, value) VALUES
 ('plans', '{"prices": {"1": 99, "2": 199, "3": 299}, "days": 30}'),
 ('ai_mail', '{"enabled": true, "daily": true, "digest": true, "fromName": "AiTraderKa", "subjectPrefix": "AiTraderKa"}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO forum_sections (id, parent_id, title, description, sort, read_plan, topic_plan, reply_plan) VALUES
 (1, NULL, 'Главное', 'Объявления и общие обсуждения', 1, 2, 2, 2),
 (2, 1, 'Объявления', 'Новости проекта от администрации', 1, 2, 9, 9),
 (3, 1, 'Обсуждение рынка', 'Крипта, нефть, золото, валюты — делимся мнениями', 2, 2, 2, 2),
 (4, NULL, 'Торговые идеи', 'Разборы, сценарии и наблюдения участников', 2, 2, 2, 2),
 (5, NULL, 'Золотой клуб', 'Закрытый раздел для подписчиков «Золото»', 3, 3, 3, 3)
ON CONFLICT (id) DO NOTHING;
SELECT setval('forum_sections_id_seq', GREATEST((SELECT MAX(id) FROM forum_sections), 5));