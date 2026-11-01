CREATE TABLE IF NOT EXISTS games_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game VARCHAR(12) NOT NULL,
  bet NUMERIC(20,2) NOT NULL,
  payout NUMERIC(20,2) NOT NULL DEFAULT 0,
  mult NUMERIC(12,4) NOT NULL DEFAULT 0,
  detail VARCHAR(200) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_games_log_user ON games_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_log_time ON games_log (created_at DESC);

CREATE TABLE IF NOT EXISTS games_rounds (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  bet NUMERIC(20,2) NOT NULL,
  crash_point NUMERIC(12,2) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_rounds_active ON games_rounds (user_id) WHERE status = 'active';
