CREATE TABLE IF NOT EXISTS ai_post_reactions (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    kind VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_ai_post_reactions_post ON ai_post_reactions (post_id);

CREATE TABLE IF NOT EXISTS ai_post_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_post_comments_post ON ai_post_comments (post_id, id);