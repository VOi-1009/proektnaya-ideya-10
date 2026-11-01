UPDATE site_settings
SET value = replace(value, '{"id": "b2", "tab": "home", "kind": "empty"', '{"id": "b2", "tab": "home", "kind": "bullbear"'),
    updated_at = NOW()
WHERE key = 'mobile_settings' AND value LIKE '%{"id": "b2", "tab": "home", "kind": "empty"%';
