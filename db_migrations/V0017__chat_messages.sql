CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    room VARCHAR(20) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages (room, id DESC);