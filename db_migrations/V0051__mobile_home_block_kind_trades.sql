UPDATE site_settings
SET value = replace(value, '{"id": "b0", "tab": "home", "kind": "empty"', '{"id": "b0", "tab": "home", "kind": "trades"'),
    updated_at = NOW()
WHERE key = 'mobile_settings'
  AND value LIKE '%{"id": "b0", "tab": "home", "kind": "empty"%';