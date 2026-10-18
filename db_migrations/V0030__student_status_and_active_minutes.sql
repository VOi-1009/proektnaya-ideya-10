ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS active_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE t_p98937530_proektnaya_ideya_10.users ADD COLUMN IF NOT EXISTS last_beat_at TIMESTAMP;

UPDATE t_p98937530_proektnaya_ideya_10.users SET status_override = status_override + 1 WHERE status_override >= 2;
UPDATE t_p98937530_proektnaya_ideya_10.chat_rooms SET min_level = min_level + 1 WHERE min_level >= 2;
UPDATE t_p98937530_proektnaya_ideya_10.forum_sections SET read_level = read_level + 1 WHERE read_level >= 2 AND read_level < 9;
UPDATE t_p98937530_proektnaya_ideya_10.forum_sections SET topic_level = topic_level + 1 WHERE topic_level >= 2 AND topic_level < 9;
UPDATE t_p98937530_proektnaya_ideya_10.forum_sections SET reply_level = reply_level + 1 WHERE reply_level >= 2 AND reply_level < 9;
ALTER TABLE t_p98937530_proektnaya_ideya_10.chat_rooms ALTER COLUMN min_level SET DEFAULT 3;