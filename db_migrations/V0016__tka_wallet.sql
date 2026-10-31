ALTER TABLE paper_accounts ALTER COLUMN balance SET DEFAULT 1000;

CREATE TABLE IF NOT EXISTS tka_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount NUMERIC(20,6) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  note VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tka_ledger_user ON tka_ledger (user_id, id DESC);

UPDATE paper_positions SET status = 'closed', close_price = entry_price, pnl = 0, close_reason = 'reset', closed_at = NOW() WHERE status = 'open';
UPDATE paper_orders SET status = 'cancelled', done_at = NOW() WHERE status = 'pending';
UPDATE paper_accounts SET balance = 1000, reset_at = NOW();

INSERT INTO tka_ledger (user_id, amount, kind, note)
SELECT user_id, 1000, 'bonus', 'Стартовый бонус' FROM paper_accounts;

INSERT INTO tka_ledger (user_id, amount, kind, note)
SELECT user_id,
  CASE code WHEN 'trade_first' THEN 50 WHEN 'trade_liq' THEN 25 WHEN 'trade_streak' THEN 200 WHEN 'trade_profit' THEN 300 ELSE 0 END,
  'reward',
  CASE code WHEN 'trade_first' THEN 'Достижение «Первая сделка»' WHEN 'trade_liq' THEN 'Достижение «Первая ликвидация»' WHEN 'trade_streak' THEN 'Достижение «Серия из 5 плюсов»' WHEN 'trade_profit' THEN 'Достижение «Профит +50%»' ELSE code END
FROM paper_awards
WHERE EXISTS (SELECT 1 FROM paper_accounts a WHERE a.user_id = paper_awards.user_id);

UPDATE paper_accounts a SET balance = a.balance + COALESCE((SELECT SUM(amount) FROM tka_ledger l WHERE l.user_id = a.user_id AND l.kind = 'reward'), 0);
