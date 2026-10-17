CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.news_reactions (
  news_id VARCHAR(32) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES t_p98937530_proektnaya_ideya_10.users(id),
  value SMALLINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (news_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_news_reactions_news ON t_p98937530_proektnaya_ideya_10.news_reactions(news_id);