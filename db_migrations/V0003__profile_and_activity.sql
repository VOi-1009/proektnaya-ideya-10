ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS bio VARCHAR(300);
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS favorite_coin VARCHAR(64);

CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.user_visits (
  user_id INTEGER NOT NULL REFERENCES t_p98937530_proektnaya_ideya_10.users(id),
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (user_id, day)
);