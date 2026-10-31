ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS team VARCHAR(10) NOT NULL DEFAULT '';
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS team_changed_at TIMESTAMP NULL;
UPDATE t_p98937530_proektnaya_ideya_10.users SET status_override = status_override - 2 WHERE status_override >= 13;
UPDATE t_p98937530_proektnaya_ideya_10.users SET status_override = NULL WHERE status_override IN (11, 12) AND id <> 2;
UPDATE t_p98937530_proektnaya_ideya_10.users SET status_override = 12 WHERE id = 2 AND email = 'baagold@yandex.ru';
UPDATE t_p98937530_proektnaya_ideya_10.chat_rooms SET min_level = min_level - 2 WHERE min_level >= 13;
UPDATE t_p98937530_proektnaya_ideya_10.chat_rooms SET min_level = 10 WHERE min_level IN (11, 12);
