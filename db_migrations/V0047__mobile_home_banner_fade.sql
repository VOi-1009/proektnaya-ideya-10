UPDATE site_settings
SET value = replace(value,
      'https://cdn.poehali.dev/projects/17c74dba-f379-4376-80b1-440f2ac081c4/bucket/6f40e9ec-503b-4c88-a78e-82a662b4a443.jpeg',
      '/mobile/home-banner.webp'),
    updated_at = NOW()
WHERE key = 'mobile_settings' AND value LIKE '%6f40e9ec-503b-4c88-a78e-82a662b4a443.jpeg%';
