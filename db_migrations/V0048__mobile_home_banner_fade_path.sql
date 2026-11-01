UPDATE site_settings
SET value = replace(value,
      '{"id": "b3", "tab": "home", "kind": "image", "title": "", "text": "", "url": "", "image": ""',
      '{"id": "b3", "tab": "home", "kind": "image", "title": "", "text": "", "url": "", "image": "/mobile/home-banner.webp"'),
    updated_at = NOW()
WHERE key = 'mobile_settings' AND value LIKE '%{"id": "b3", "tab": "home", "kind": "image", "title": "", "text": "", "url": "", "image": ""%';
