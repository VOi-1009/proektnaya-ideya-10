CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.article_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE t_p98937530_proektnaya_ideya_10.articles ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES t_p98937530_proektnaya_ideya_10.article_categories(id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON t_p98937530_proektnaya_ideya_10.articles(category_id);
INSERT INTO t_p98937530_proektnaya_ideya_10.article_categories (name, sort_order) VALUES ('Обучение', 1), ('Аналитика', 2), ('Мнения', 3);