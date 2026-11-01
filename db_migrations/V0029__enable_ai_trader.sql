UPDATE site_settings
SET value = (value::jsonb || '{"enabled": true, "startBalance": 100000}'::jsonb)::text, updated_at = NOW()
WHERE key = 'ai_trader';
