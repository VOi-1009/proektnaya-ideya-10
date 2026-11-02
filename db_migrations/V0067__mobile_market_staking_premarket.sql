UPDATE site_settings
SET value = replace(value,
      '{"id": "b_mycoins", "tab": "market", "kind": "my_coins", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}',
      '{"id": "b_mycoins", "tab": "market", "kind": "my_coins", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}, {"id": "b_staking", "tab": "market", "kind": "staking", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}, {"id": "b_premarket", "tab": "market", "kind": "premarket", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}'),
    updated_at = NOW()
WHERE key = 'mobile_settings'
  AND value LIKE '%"id": "b_mycoins"%'
  AND value NOT LIKE '%"id": "b_staking"%';