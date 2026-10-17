ALTER TABLE ai_posts ADD COLUMN IF NOT EXISTS move_key VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_posts_move_key ON ai_posts (move_key) WHERE move_key IS NOT NULL;