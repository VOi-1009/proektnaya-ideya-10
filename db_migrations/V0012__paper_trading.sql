CREATE TABLE IF NOT EXISTS paper_accounts (
  user_id INTEGER PRIMARY KEY,
  balance NUMERIC(20,6) NOT NULL DEFAULT 10000,
  resets INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reset_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_positions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  coin_id VARCHAR(40) NOT NULL,
  side VARCHAR(5) NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  margin NUMERIC(20,6) NOT NULL,
  size NUMERIC(30,10) NOT NULL,
  entry_price NUMERIC(30,10) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'open',
  close_price NUMERIC(30,10),
  pnl NUMERIC(20,6),
  close_reason VARCHAR(20),
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_paper_positions_user ON paper_positions (user_id, status);

CREATE TABLE IF NOT EXISTS paper_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  coin_id VARCHAR(40) NOT NULL,
  side VARCHAR(5) NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  margin NUMERIC(20,6) NOT NULL,
  limit_price NUMERIC(30,10) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  done_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_paper_orders_user ON paper_orders (user_id, status);
