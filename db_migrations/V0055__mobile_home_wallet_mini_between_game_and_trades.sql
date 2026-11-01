UPDATE site_settings
SET value = replace(value,
      '{"id": "b0", "tab": "home", "kind": "trades", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}, {"id": "b1", "tab": "home", "kind": "bullbear", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}',
      '{"id": "b1", "tab": "home", "kind": "bullbear", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}, {"id": "b_wallet", "tab": "home", "kind": "wallet_mini", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}, {"id": "b0", "tab": "home", "kind": "trades", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}'),
    updated_at = NOW()
WHERE key = 'mobile_settings'
  AND value LIKE '%{"id": "b0", "tab": "home", "kind": "trades"%'
  AND value NOT LIKE '%"id": "b_wallet"%';