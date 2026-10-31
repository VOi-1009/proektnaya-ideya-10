CREATE TABLE IF NOT EXISTS usdt_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount NUMERIC(20,6) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  note VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usdt_ledger_user ON usdt_ledger (user_id, id DESC);

INSERT INTO usdt_ledger (user_id, amount, kind, note, created_at)
SELECT user_id, amount, kind, note, created_at FROM tka_ledger;

INSERT INTO tka_ledger (user_id, amount, kind, note)
SELECT user_id, -SUM(amount), 'exchange', 'Перенос на биржу (виртуальные USDT)'
FROM tka_ledger GROUP BY user_id HAVING SUM(amount) <> 0;

ALTER TABLE paper_accounts ALTER COLUMN balance SET DEFAULT 0;
