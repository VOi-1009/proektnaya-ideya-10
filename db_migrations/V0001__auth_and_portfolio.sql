CREATE TABLE t_p98937530_proektnaya_ideya_10.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p98937530_proektnaya_ideya_10.sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p98937530_proektnaya_ideya_10.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE t_p98937530_proektnaya_ideya_10.holdings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p98937530_proektnaya_ideya_10.users(id),
  coin_id VARCHAR(64) NOT NULL,
  amount NUMERIC(30, 10) NOT NULL,
  buy_price NUMERIC(30, 10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holdings_user ON t_p98937530_proektnaya_ideya_10.holdings(user_id);
CREATE INDEX idx_sessions_user ON t_p98937530_proektnaya_ideya_10.sessions(user_id);