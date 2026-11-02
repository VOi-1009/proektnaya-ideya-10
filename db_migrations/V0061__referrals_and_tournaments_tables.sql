CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  inviter_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL UNIQUE,
  source VARCHAR(12) NOT NULL DEFAULT 'link',
  code VARCHAR(24) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  reward_tka NUMERIC(20,2) NOT NULL DEFAULT 0,
  reward_usdt NUMERIC(20,2) NOT NULL DEFAULT 0,
  fund_amount NUMERIC(20,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  rewarded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS referrals_inviter_idx ON referrals (inviter_id, status);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals (status);

CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(600) NOT NULL DEFAULT '',
  kind VARCHAR(12) NOT NULL,
  entry_fee NUMERIC(20,2) NOT NULL DEFAULT 0,
  prize_pool NUMERIC(20,2) NOT NULL DEFAULT 0,
  prize_split VARCHAR(40) NOT NULL DEFAULT '60,30,10',
  fee_percent NUMERIC(6,2) NOT NULL DEFAULT 10,
  min_players INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 0,
  min_level INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'upcoming',
  badge_item_id INTEGER,
  created_by INTEGER,
  finished_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tournaments_status_idx ON tournaments (status, ends_at);

CREATE TABLE IF NOT EXISTS tournament_entries (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  team VARCHAR(10) NOT NULL DEFAULT '',
  paid NUMERIC(20,2) NOT NULL DEFAULT 0,
  place INTEGER,
  score NUMERIC(20,4),
  prize NUMERIC(20,2) NOT NULL DEFAULT 0,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS tournament_entries_user_idx ON tournament_entries (user_id);