ALTER TABLE t_p98937530_proektnaya_ideya_10.users ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS yandex_id VARCHAR(50);
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_yandex_id ON t_p98937530_proektnaya_ideya_10.users(yandex_id);

CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p98937530_proektnaya_ideya_10.users(id),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON t_p98937530_proektnaya_ideya_10.refresh_tokens(user_id);