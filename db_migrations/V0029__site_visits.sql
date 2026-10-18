CREATE TABLE IF NOT EXISTS site_visits (
    id BIGSERIAL PRIMARY KEY,
    visitor_id VARCHAR(40) NOT NULL,
    user_id INTEGER,
    path VARCHAR(200) NOT NULL DEFAULT '/',
    referrer VARCHAR(200) NOT NULL DEFAULT '',
    device VARCHAR(10) NOT NULL DEFAULT 'desktop',
    is_new BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_visits_created ON site_visits (created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor ON site_visits (visitor_id, created_at);