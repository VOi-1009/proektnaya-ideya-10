UPDATE users SET status_override = status_override + 4 WHERE status_override >= 4;
UPDATE chat_rooms SET min_level = min_level + 4 WHERE min_level >= 4;
UPDATE forum_sections SET read_level = read_level + 4 WHERE read_level >= 4;
UPDATE forum_sections SET topic_level = topic_level + 4 WHERE topic_level >= 4;
UPDATE forum_sections SET reply_level = reply_level + 4 WHERE reply_level >= 4;
