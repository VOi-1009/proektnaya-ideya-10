export type GoFn = (ch: string, coinId?: string) => void;

export const CHANNELS = [
  { id: "welcome", name: "обзор-рынка", topic: "", icon: "Hash" },
  { id: "market", name: "котировки", topic: "Цены и графики топовых монет в реальном времени", icon: "Hash" },
  { id: "news", name: "новости-криптовалют", short: "Крипто-новости", topic: "Криптоновости: Bits.media, Investing.com, Финам, Ведомости", icon: "Hash" },
  { id: "world", name: "мировые-новости", short: "Мир", topic: "Политика, экономика и события в мире: ТАСС, РБК, Lenta.ru, Ведомости", icon: "Hash" },
  { id: "articles", name: "статьи", topic: "Разборы и обучающие материалы от редакции", icon: "Hash" },
  { id: "ainews", name: "новости-AiTraderKa", short: "AiTraderKa", topic: "Дайджесты и заметки ИИ-бота AiTraderKa", icon: "Sparkles" },
  { id: "forum", name: "форум", topic: "Обсуждения по разделам: рынок, идеи, закрытые клубы", icon: "Hash" },
  { id: "alerts", name: "уведомления", topic: "Оповещения о достижении целевой цены", icon: "Hash" },
  { id: "portfolio", name: "мой-портфель", topic: "Стоимость ваших монет, прибыль и убыток", icon: "Hash" },
  { id: "rules", name: "о-проекте-и-правила", short: "Правила", topic: "Статусы, достижения, правила общения и о том, что мы информационно-развлекательный проект", icon: "Info" },
  { id: "converter", name: "конвертер", topic: "Пересчёт монет, валют и рубля по текущему курсу", icon: "Hash" },
];

export const PINNED = ["bitcoin", "brent", "usd-rub", "eur-rub"];

export const loadFavs = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem("svecha-favs") ?? "null");
    return Array.isArray(v) ? v : ["ethereum", "gold"];
  } catch {
    return ["ethereum", "gold"];
  }
};