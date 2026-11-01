UPDATE site_settings
SET value = replace(replace(replace(value,
      '{"id": "b1", "tab": "home", "kind": "market_summary"', '{"id": "b1", "tab": "home", "kind": "__TMP__"'),
      '{"id": "b2", "tab": "home", "kind": "bullbear"', '{"id": "b2", "tab": "home", "kind": "market_summary"'),
      '"kind": "__TMP__"', '"kind": "bullbear"'),
    updated_at = NOW()
WHERE key = 'mobile_settings'
  AND value LIKE '%{"id": "b1", "tab": "home", "kind": "market_summary"%'
  AND value LIKE '%{"id": "b2", "tab": "home", "kind": "bullbear"%';
