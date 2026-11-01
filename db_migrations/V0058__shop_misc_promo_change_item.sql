INSERT INTO shop_items (slug, kind, name, description, emoji, price, sort, enabled)
VALUES ('m_promo', 'misc', 'Смена личного промокода', 'Замените личный промокод на свой: 4-16 латинских букв и цифр. Можно менять сколько угодно раз, каждая смена стоит 10 000 TKA.', '🎟', 10000, 10, TRUE)
ON CONFLICT (slug) DO NOTHING;