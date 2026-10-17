ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS status_override SMALLINT;
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON t_p98937530_proektnaya_ideya_10.users(last_seen_at DESC);
UPDATE t_p98937530_proektnaya_ideya_10.users SET status_override = 6 WHERE email = 'baagold@yandex.ru';