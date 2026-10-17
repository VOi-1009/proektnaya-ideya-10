ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS founder_no INTEGER;

UPDATE t_p98937530_proektnaya_ideya_10.users u SET founder_no = t.rn
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM t_p98937530_proektnaya_ideya_10.users WHERE NOT is_bot) t
WHERE u.id = t.id AND t.rn <= 100;

CREATE TABLE IF NOT EXISTS t_p98937530_proektnaya_ideya_10.site_news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  body VARCHAR(2000) NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO t_p98937530_proektnaya_ideya_10.site_news (title, body)
VALUES ('Запустили «Редкие достижения»', 'Первые 100 участников получают статус «Основатель» — навсегда. Успейте попасть в сотню!');