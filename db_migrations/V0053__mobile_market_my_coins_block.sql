UPDATE site_settings
SET value = replace(value,
      '{"id": "b2", "tab": "market", "kind": "market_summary"',
      '{"id": "b_mycoins", "tab": "market", "kind": "my_coins", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}, {"id": "b2", "tab": "market", "kind": "market_summary"'),
    updated_at = NOW()
WHERE key = 'mobile_settings'
  AND value LIKE '%{"id": "b2", "tab": "market", "kind": "market_summary"%'
  AND value NOT LIKE '%"id": "b_mycoins"%';