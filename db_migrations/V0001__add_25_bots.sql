INSERT INTO t_p98937530_proektnaya_ideya_10.users (email, password_hash, name, city, status_override, is_bot, avatar_url)
SELECT 'bot-' || substr(md5('bot25-' || t.n), 1, 12) || '@bots.traderka.ru', '', t.name, t.city, t.lvl, TRUE, '/bot-avatars/' || t.n || '.png'
FROM (VALUES
(1,'MaxTrade','Москва',1),(2,'OrbitCoin','Санкт-Петербург',1),(3,'LuckyStrike','Казань',2),(4,'Anna_Crypto','Новосибирск',1),(5,'DenisBTC','Екатеринбург',1),
(6,'VeraInvest','Самара',2),(7,'ByteHunter','Краснодар',1),(8,'SunnyDay','Сочи',1),(9,'IvanHodl','Нижний Новгород',2),(10,'NeonWolf','Воронеж',1),
(11,'RedFox','Ростов-на-Дону',1),(12,'KatyaTrader','Пермь',1),(13,'OlegBull','Уфа',2),(14,'MishaBear','Тюмень',1),(15,'CoinCollector','Омск',1),
(16,'TimaChart','Челябинск',1),(17,'SashaAlt','Калининград',1),(18,'AlphaSignal','Владивосток',2),(19,'MoonWalker','Красноярск',1),(20,'LenaMarket','Иркутск',1),
(21,'PavelDeFi','Тула',1),(22,'GlebSatoshi','Рязань',1),(23,'HodlMaster','Томск',2),(24,'DashaPips','Липецк',1),(25,'RomaWhale','Хабаровск',1)
) AS t(n, name, city, lvl);