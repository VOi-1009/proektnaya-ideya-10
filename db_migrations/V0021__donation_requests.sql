CREATE TABLE IF NOT EXISTS donation_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_donation_requests_status ON donation_requests (status, id DESC);