CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_ok_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_messages (
  id SERIAL PRIMARY KEY,
  post_id INTEGER,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(400) NOT NULL DEFAULT '',
  url VARCHAR(300) NOT NULL DEFAULT '/m',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_queue (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL,
  sub_id INTEGER NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  error VARCHAR(300) NOT NULL DEFAULT '',
  sent_at TIMESTAMP,
  UNIQUE (message_id, sub_id)
);

CREATE INDEX IF NOT EXISTS push_queue_status_idx ON push_queue (status, id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);