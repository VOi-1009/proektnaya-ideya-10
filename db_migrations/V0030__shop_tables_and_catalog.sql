CREATE TABLE IF NOT EXISTS shop_items (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE,
  kind VARCHAR(12) NOT NULL,
  name VARCHAR(60) NOT NULL,
  description VARCHAR(200) NOT NULL DEFAULT '',
  emoji VARCHAR(8) NOT NULL DEFAULT '',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER,
  sold INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  source VARCHAR(10) NOT NULL DEFAULT 'buy',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_user ON shop_purchases (user_id);

CREATE TABLE IF NOT EXISTS shop_equipped (
  user_id INTEGER NOT NULL,
  kind VARCHAR(12) NOT NULL,
  item_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind)
);

CREATE TABLE IF NOT EXISTS shop_gifts (
  id SERIAL PRIMARY KEY,
  from_user INTEGER NOT NULL,
  to_user INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  message VARCHAR(140) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_gifts_to ON shop_gifts (to_user, id DESC);
CREATE INDEX IF NOT EXISTS idx_shop_gifts_from ON shop_gifts (from_user, created_at);

INSERT INTO shop_items (slug, kind, name, description, emoji, price, sort) VALUES
('h_sunset', 'header', 'Закат', 'Тёплая оранжево-розовая шапка над вашими постами', '', 60, 10),
('h_ocean', 'header', 'Океан', 'Прохладный сине-бирюзовый градиент', '', 60, 20),
('h_neon', 'header', 'Неон', 'Яркая фиолетово-голубая подсветка', '', 90, 30),
('h_fire', 'header', 'Огонь', 'Красно-оранжевая шапка для горячих идей', '', 80, 40),
('h_aurora', 'header', 'Северное сияние', 'Зелёно-фиолетовый переливающийся градиент', '', 120, 50),
('h_gold', 'header', 'Золотая лента', 'Благородное золото для самых уважаемых авторов', '', 200, 60),
('f_emerald', 'frame', 'Изумрудная рамка', 'Спокойное зелёное свечение вокруг аватара', '', 120, 10),
('f_neon', 'frame', 'Неоновая рамка', 'Голубое неоновое кольцо', '', 150, 20),
('f_flame', 'frame', 'Огненная рамка', 'Горячее оранжево-красное кольцо', '', 180, 30),
('f_gold', 'frame', 'Золотая рамка', 'Золотое кольцо с мягким сиянием', '', 250, 40),
('f_rainbow', 'frame', 'Радужная рамка', 'Переливающееся разноцветное кольцо', '', 300, 50),
('c_night', 'card', 'Ночной город', 'Тёмно-синяя шапка вашей мини-карточки', '', 100, 10),
('c_forest', 'card', 'Лес', 'Глубокий зелёный фон карточки', '', 100, 20),
('c_bull', 'card', 'Бычий рынок', 'Зелёный восходящий градиент', '', 150, 30),
('c_bear', 'card', 'Медвежий рынок', 'Красный нисходящий градиент', '', 150, 40),
('c_royal', 'card', 'Королевская', 'Пурпурно-золотая шапка для особого случая', '', 220, 50),
('t_glass', 'theme', 'Стекло', 'Светлая прозрачная тема ваших постов', '', 120, 10),
('t_midnight', 'theme', 'Полночь', 'Тёмно-синий фон и тонкая голубая рамка', '', 150, 20),
('t_mint', 'theme', 'Мята', 'Свежий зелёный оттенок сообщений', '', 150, 30),
('t_gold', 'theme', 'Золотая тема', 'Тёплый золотой фон и рамка постов', '', 250, 40),
('b_star', 'badge', 'Звезда', 'Маленький значок рядом с ником', '⭐', 60, 10),
('b_rocket', 'badge', 'Ракета', 'К луне! Значок рядом с ником', '🚀', 80, 20),
('b_bull', 'badge', 'Бык', 'Для тех, кто верит в рост', '🐂', 100, 30),
('b_bear', 'badge', 'Медведь', 'Для тех, кто ждёт коррекцию', '🐻', 100, 40),
('b_whale', 'badge', 'Кит', 'Редкий значок для больших игроков', '🐋', 300, 50),
('b_diamond', 'badge', 'Алмазные руки', 'Держим до конца', '💎', 400, 60),
('g_coffee', 'gift', 'Кофе', 'Бодрящий подарок другому участнику', '☕', 15, 10),
('g_flower', 'gift', 'Цветок', 'Просто приятно', '🌹', 20, 20),
('g_trophy', 'gift', 'Кубок', 'За отличную сделку или хороший пост', '🏆', 60, 30),
('g_coin', 'gift', 'Золотая монета', 'Щедрый подарок', '🪙', 100, 40),
('g_moon', 'gift', 'Билет на Луну', 'Самый эффектный подарок', '🌕', 150, 50)
ON CONFLICT (slug) DO NOTHING;
