ALTER TABLE ai_posts ADD COLUMN IF NOT EXISTS post_date DATE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_posts_daily ON ai_posts (post_date) WHERE kind = 'daily';