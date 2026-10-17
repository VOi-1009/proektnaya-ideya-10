CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.radars (
  id SERIAL PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  color VARCHAR(16) NOT NULL DEFAULT '#22d3ee',
  kind VARCHAR(20) NOT NULL DEFAULT 'liq_heatmap',
  symbol VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT',
  url VARCHAR(1000) NOT NULL DEFAULT '',
  description VARCHAR(500) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO t_p98937530_proektnaya_ideya_10.radars (title, color, kind, symbol, description, sort_order)
VALUES ('тепловая-карта-BTC', '#22d3ee', 'liq_heatmap', 'BTCUSDT', 'Где скопились ликвидации лонгов и шортов по биткоину', 0);