CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.news_items (
  id VARCHAR(32) PRIMARY KEY,
  kind VARCHAR(16) NOT NULL DEFAULT 'crypto',
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  source VARCHAR(60) NOT NULL DEFAULT '',
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);