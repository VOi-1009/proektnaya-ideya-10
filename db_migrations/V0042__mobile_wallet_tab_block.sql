UPDATE site_settings
SET value = replace(
      value,
      '"enabled": true}]}',
      '"enabled": true}, {"id": "b5", "tab": "profile", "kind": "wallet", "title": "", "text": "", "url": "", "enabled": true}]}'),
    updated_at = NOW()
WHERE key = 'mobile_settings' AND value NOT LIKE '%"kind": "wallet"%';
