CREATE TABLE IF NOT EXISTS contests (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(600) NOT NULL DEFAULT '',
  kind VARCHAR(12) NOT NULL DEFAULT 'random',
  prize NUMERIC(20,2) NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  winner_id INTEGER,
  finished_at TIMESTAMPTZ,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contests_status_end ON contests (status, ends_at);

CREATE TABLE IF NOT EXISTS contest_entries (
  contest_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contest_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_contest_entries_user ON contest_entries (user_id);
