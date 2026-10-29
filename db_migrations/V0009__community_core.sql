CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  body VARCHAR(2000) NOT NULL DEFAULT '',
  image_url VARCHAR(500) NOT NULL DEFAULT '',
  sentiment VARCHAR(10) NOT NULL DEFAULT '',
  coins VARCHAR(200) NOT NULL DEFAULT '',
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts (user_id);

CREATE TABLE IF NOT EXISTS community_reactions (
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  emoji VARCHAR(8) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS community_follows (
  follower_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, author_id)
);
CREATE INDEX IF NOT EXISTS idx_community_follows_author ON community_follows (author_id);