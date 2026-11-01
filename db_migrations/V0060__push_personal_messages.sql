ALTER TABLE push_messages ADD COLUMN IF NOT EXISTS user_id INTEGER;

CREATE TABLE IF NOT EXISTS push_sent (
  user_id INTEGER NOT NULL,
  ref VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, ref)
);

CREATE INDEX IF NOT EXISTS push_messages_user_idx ON push_messages (user_id);