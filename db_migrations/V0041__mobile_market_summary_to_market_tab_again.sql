UPDATE site_settings
SET value = replace(value, '{"id": "b2", "tab": "home", "kind": "market_summary"', '{"id": "b2", "tab": "market", "kind": "market_summary"'),
    updated_at = NOW()
WHERE key = 'mobile_settings' AND value LIKE '%{"id": "b2", "tab": "home", "kind": "market_summary"%';
