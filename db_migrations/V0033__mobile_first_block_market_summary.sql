UPDATE site_settings
SET value = replace(value, '{"id": "b1", "tab": "home", "kind": "empty"', '{"id": "b1", "tab": "home", "kind": "market_summary"'),
    updated_at = NOW()
WHERE key = 'mobile_settings' AND value LIKE '%{"id": "b1", "tab": "home", "kind": "empty"%';
