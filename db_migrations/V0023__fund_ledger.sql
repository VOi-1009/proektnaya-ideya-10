CREATE TABLE IF NOT EXISTS fund_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount NUMERIC(20,6) NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'fee',
  note VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fund_ledger_user ON fund_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_fund_ledger_id ON fund_ledger (id DESC);
