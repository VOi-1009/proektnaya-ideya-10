CREATE TABLE IF NOT EXISTS staking_pools (
  id SERIAL PRIMARY KEY,
  coin_slug VARCHAR(40) NOT NULL,
  term_days INTEGER NOT NULL DEFAULT 0,
  apy NUMERIC(8,2) NOT NULL DEFAULT 10,
  min_amount NUMERIC(20,2) NOT NULL DEFAULT 10,
  max_total NUMERIC(20,2) NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (coin_slug, term_days)
);

CREATE TABLE IF NOT EXISTS stakes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  pool_id INTEGER NOT NULL,
  amount NUMERIC(20,2) NOT NULL,
  apy NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP,
  last_claim_at TIMESTAMP NOT NULL DEFAULT NOW(),
  earned NUMERIC(20,4) NOT NULL DEFAULT 0,
  status VARCHAR(8) NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS stakes_user_idx ON stakes (user_id, status);
CREATE INDEX IF NOT EXISTS stakes_pool_idx ON stakes (pool_id, status);