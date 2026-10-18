CREATE TABLE IF NOT EXISTS chat_rooms (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    topic VARCHAR(200) NOT NULL DEFAULT '',
    color VARCHAR(10) NOT NULL DEFAULT 'sky',
    access VARCHAR(10) NOT NULL DEFAULT 'level',
    min_level INTEGER NOT NULL DEFAULT 2,
    sort INTEGER NOT NULL DEFAULT 10,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id VARCHAR(20) NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

INSERT INTO chat_rooms (id, name, topic, color, access, min_level, sort) VALUES
 ('green', 'Чат зеленых', 'Общение для тех, кто ждёт роста рынка', 'emerald', 'level', 2, 1),
 ('red', 'Чат красных', 'Общение для тех, кто ждёт падения рынка', 'rose', 'level', 2, 2)
ON CONFLICT (id) DO NOTHING;