CREATE TABLE IF NOT EXISTS paper_awards (
  user_id INTEGER NOT NULL,
  code VARCHAR(30) NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, code)
);

INSERT INTO paper_awards (user_id, code, points)
SELECT DISTINCT user_id, 'trade_first', 30 FROM paper_positions
ON CONFLICT DO NOTHING;

INSERT INTO paper_awards (user_id, code, points)
SELECT DISTINCT user_id, 'trade_liq', 20 FROM paper_positions WHERE close_reason = 'liquidation'
ON CONFLICT DO NOTHING;

INSERT INTO paper_awards (user_id, code, points)
SELECT DISTINCT user_id, 'trade_profit', 100 FROM paper_positions
WHERE status = 'closed' AND COALESCE(close_reason, '') <> 'reset' AND margin > 0 AND pnl / margin >= 0.5
ON CONFLICT DO NOTHING;

INSERT INTO paper_awards (user_id, code, points)
SELECT DISTINCT user_id, 'trade_streak', 100 FROM (
  SELECT user_id, grp, COUNT(*) c FROM (
    SELECT user_id, pnl,
      SUM(CASE WHEN pnl <= 0 THEN 1 ELSE 0 END) OVER (PARTITION BY user_id ORDER BY closed_at, id) grp
    FROM paper_positions
    WHERE status = 'closed' AND COALESCE(close_reason, '') <> 'reset'
  ) t WHERE pnl > 0 GROUP BY user_id, grp
) s WHERE c >= 5
ON CONFLICT DO NOTHING;
