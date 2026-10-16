export type NewsTag = "Рынок" | "Регулирование" | "Технологии" | "Аналитика" | "DeFi";

export interface NewsItem {
  id: number;
  tag: NewsTag;
  title: string;
  text: string;
  author: string;
  avatar: string;
  avatarClass: string;
  time: string;
  coins: string[];
  hot?: boolean;
  reactions: { e: string; n: number }[];
}

export const NEWS_TAGS: NewsTag[] = ["Рынок", "Аналитика", "Регулирование", "Технологии", "DeFi"];

export const TAG_STYLE: Record<NewsTag, string> = {
  Рынок: "text-primary border-primary/40",
  Аналитика: "text-accent border-accent/40",
  Регулирование: "text-sky-400 border-sky-400/40",
  Технологии: "text-violet-300 border-violet-300/40",
  DeFi: "text-pink-300 border-pink-300/40",
};

export const NEWS: NewsItem[] = [
  {
    id: 1,
    tag: "Рынок",
    title: "Биткоин удерживает зону $80 тыс. после волатильной недели",
    text: "Покупатели трижды защитили уровень, объёмы на споте постепенно снижаются. Фандинг по бессрочным фьючерсам вернулся к нейтральным значениям — рынок ждёт импульса.",
    author: "Редакция Свечи",
    avatar: "С",
    avatarClass: "bg-primary text-primary-foreground",
    time: "Сегодня в 09:42",
    coins: ["BTC"],
    hot: true,
    reactions: [
      { e: "🔥", n: 48 },
      { e: "📈", n: 21 },
    ],
  },
  {
    id: 2,
    tag: "Аналитика",
    title: "Отношение ETH/BTC на многолетних минимумах: что дальше",
    text: "Разбираем три сценария для эфира: продолжение слабости, разворот на фоне роста активности L2 и боковик до следующего обновления сети.",
    author: "Ольга Графики",
    avatar: "О",
    avatarClass: "bg-amber-400 text-black",
    time: "Сегодня в 08:15",
    coins: ["ETH", "BTC"],
    reactions: [
      { e: "🧠", n: 34 },
      { e: "👀", n: 12 },
    ],
  },
  {
    id: 3,
    tag: "Регулирование",
    title: "Регуляторы обсуждают новые правила для криптобирж",
    text: "В фокусе — требования к хранению средств клиентов и раскрытию резервов. Собрали главное, что может измениться для частных трейдеров.",
    author: "Редакция Свечи",
    avatar: "С",
    avatarClass: "bg-primary text-primary-foreground",
    time: "Вчера в 19:30",
    coins: [],
    reactions: [{ e: "⚖️", n: 17 }],
  },
  {
    id: 4,
    tag: "Технологии",
    title: "Сеть TON ускоряет транзакции: что получат пользователи",
    text: "Разработчики анонсировали обновление, которое должно снизить задержки и комиссии. Смотрим, как это может повлиять на активность в мини-приложениях.",
    author: "Денис Нода",
    avatar: "Д",
    avatarClass: "bg-sky-500 text-white",
    time: "Вчера в 16:04",
    coins: ["TON"],
    reactions: [
      { e: "💎", n: 29 },
      { e: "🚀", n: 15 },
    ],
  },
  {
    id: 5,
    tag: "DeFi",
    title: "Доходность стейблкоинов в DeFi снова растёт",
    text: "Ставки в крупных лендинговых протоколах поднялись вслед за спросом на кредитное плечо. Напоминаем о рисках смарт-контрактов и депега.",
    author: "Мария Пулы",
    avatar: "М",
    avatarClass: "bg-pink-400 text-black",
    time: "Вчера в 12:47",
    coins: ["ETH", "SOL"],
    reactions: [{ e: "💰", n: 22 }],
  },
  {
    id: 6,
    tag: "Аналитика",
    title: "Солана: ключевые уровни на неделю",
    text: "Поддержка — $98, сопротивление — $112. Пробой любой из границ откроет движение на 8–10%. Объёмы на DEX остаются высокими.",
    author: "Ольга Графики",
    avatar: "О",
    avatarClass: "bg-amber-400 text-black",
    time: "14 окт. в 21:10",
    coins: ["SOL"],
    hot: true,
    reactions: [
      { e: "📊", n: 40 },
      { e: "🔥", n: 18 },
    ],
  },
  {
    id: 7,
    tag: "Рынок",
    title: "Альткоины отстают от биткоина: индекс сезона альтов падает",
    text: "Доминация BTC продолжает расти. Капитал концентрируется в крупнейших активах, а мемкоины теряют объёмы.",
    author: "Редакция Свечи",
    avatar: "С",
    avatarClass: "bg-primary text-primary-foreground",
    time: "14 окт. в 10:22",
    coins: ["BTC", "DOGE", "ADA"],
    reactions: [{ e: "📉", n: 26 }],
  },
];
