UPDATE users SET active_minutes = CASE
  WHEN COALESCE(status_override, 1) <= 1 THEN 30 + floor(random() * 221)::int
  WHEN status_override = 2 THEN 200 + floor(random() * 301)::int
  WHEN status_override = 3 THEN 400 + floor(random() * 401)::int
  ELSE 700 + floor(random() * 301)::int
END
WHERE is_bot = TRUE AND COALESCE(active_minutes, 0) = 0;