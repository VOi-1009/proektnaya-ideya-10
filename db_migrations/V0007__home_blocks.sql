CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.home_blocks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL DEFAULT '',
  left_text TEXT NOT NULL DEFAULT '',
  left_image TEXT,
  right_text TEXT NOT NULL DEFAULT '',
  right_image TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);