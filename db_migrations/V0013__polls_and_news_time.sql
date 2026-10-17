ALTER TABLE t_p98937530_proektnaya_ideya_10.news_items ADD COLUMN IF NOT EXISTS published_ms BIGINT;

CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.polls (
  id SERIAL PRIMARY KEY,
  question VARCHAR(300) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  bots_vote BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES t_p98937530_proektnaya_ideya_10.polls(id),
  text VARCHAR(150) NOT NULL,
  seed_votes INTEGER NOT NULL DEFAULT 0,
  position SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.poll_votes (
  poll_id INTEGER NOT NULL REFERENCES t_p98937530_proektnaya_ideya_10.polls(id),
  user_id INTEGER NOT NULL REFERENCES t_p98937530_proektnaya_ideya_10.users(id),
  option_id INTEGER NOT NULL REFERENCES t_p98937530_proektnaya_ideya_10.poll_options(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON t_p98937530_proektnaya_ideya_10.poll_options(poll_id);