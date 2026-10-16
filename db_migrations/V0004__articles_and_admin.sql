ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE t_p98937530_proektnaya_ideya_10.users SET is_admin = TRUE WHERE email = 'baagold@yandex.ru';

CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(500) NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  author_id INTEGER REFERENCES t_p98937530_proektnaya_ideya_10.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_articles_published ON t_p98937530_proektnaya_ideya_10.articles(published, created_at DESC);