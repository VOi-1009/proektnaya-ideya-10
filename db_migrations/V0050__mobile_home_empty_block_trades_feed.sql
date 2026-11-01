UPDATE site_settings
SET value = replace(value,
      '"blocks": [{"id": "b1", "tab": "home", "kind": "bullbear"',
      '"blocks": [{"id": "b0", "tab": "home", "kind": "empty", "title": "", "text": "", "url": "", "enabled": true, "fade": 0, "image": ""}, {"id": "b1", "tab": "home", "kind": "bullbear"'),
    updated_at = NOW()
WHERE key = 'mobile_settings'
  AND value LIKE '%"blocks": [{"id": "b1", "tab": "home", "kind": "bullbear"%'
  AND value NOT LIKE '%"id": "b0"%';