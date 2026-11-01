ALTER TABLE paper_positions ADD COLUMN IF NOT EXISTS ai_posted BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_paper_positions_user_closed ON paper_positions (user_id, closed_at DESC);
