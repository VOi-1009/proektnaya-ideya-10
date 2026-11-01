CREATE TABLE IF NOT EXISTS games_bb_rounds (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  side VARCHAR(5) NOT NULL,
  bet NUMERIC(20,2) NOT NULL,
  mult NUMERIC(8,2) NOT NULL,
  entry_price NUMERIC(24,8) NOT NULL,
  exit_price NUMERIC(24,8),
  payout NUMERIC(20,2),
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP NOT NULL,
  settled_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_bb_active_user ON games_bb_rounds (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_games_bb_due ON games_bb_rounds (ends_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_games_bb_user ON games_bb_rounds (user_id, id DESC);
