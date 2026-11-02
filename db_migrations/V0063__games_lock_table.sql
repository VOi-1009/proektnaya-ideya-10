CREATE TABLE IF NOT EXISTS games_lock (
  name VARCHAR(30) PRIMARY KEY,
  locked_until TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO games_lock (name, locked_until) VALUES ('games', NOW() - INTERVAL '1 minute') ON CONFLICT (name) DO NOTHING;