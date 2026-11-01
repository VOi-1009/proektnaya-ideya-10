UPDATE site_settings
SET value = replace(value, '{"id": "b1", "tab": "market", "kind": "market_summary"', '{"id": "b1", "tab": "home", "kind": "market_summary"'),
    updated_at = NOW()
WHERE key = 'mobile_settings' AND value LIKE '%{"id": "b1", "tab": "market", "kind": "market_summary"%';
