UPDATE site_settings
SET value = replace(
      value,
      '"tabs": [{"id": "home", "label": "Главная", "icon": "Home", "enabled": true}, {"id": "market", "label": "Котировки", "icon": "LineChart", "enabled": true}, {"id": "news", "label": "Новости", "icon": "Newspaper", "enabled": true}, {"id": "games", "label": "Игры", "icon": "Gamepad2", "enabled": true}, {"id": "profile", "label": "Профиль", "icon": "UserRound", "enabled": true}]',
      '"tabs": [{"id": "home", "label": "Главная", "icon": "Home", "enabled": true}, {"id": "market", "label": "Котировки", "icon": "LineChart", "enabled": true}, {"id": "profile", "label": "Профиль", "icon": "UserRound", "enabled": true}, {"id": "news", "label": "Новости", "icon": "Newspaper", "enabled": true}, {"id": "games", "label": "Игры", "icon": "Gamepad2", "enabled": true}]'
    ),
    updated_at = NOW()
WHERE key = 'mobile_settings';
