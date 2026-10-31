export type GoFn = (ch: string, coinId?: string) => void;

export const CHANNELS = [
  { id: "welcome", name: "главная", topic: "", icon: "Hash" },
  { id: "market", name: "котировки", topic: "Цены и графики топовых монет в реальном времени", icon: "Hash" },
  { id: "news", name: "новости", short: "Новости", topic: "Криптовалюты, сырьё и акции", icon: "Hash" },
  { id: "articles", name: "статьи", topic: "Разборы и обучающие материалы от редакции", icon: "Hash" },
  { id: "ainews", name: "новости-AiTKA", short: "AiTKA", topic: "Дайджесты и заметки ИИ-бота AiTKA", icon: "Sparkles" },
  { id: "forum", name: "форум", topic: "Обсуждения по разделам: рынок, идеи, закрытые клубы", icon: "Hash" },
  { id: "alerts", name: "уведомления", topic: "Оповещения о достижении целевой цены", icon: "Hash" },
  { id: "trading", name: "тренировочная-биржа", short: "Биржа", topic: "Игровая монета TKA, реальные курсы, плечо, шорт и рейтинг трейдеров", icon: "Hash" },
  { id: "portfolio", name: "мой-портфель", topic: "Стоимость ваших монет, прибыль и убыток", icon: "Hash" },
  { id: "rules", name: "о-проекте-и-правила", short: "Правила", topic: "Статусы, достижения, правила общения и о том, что мы информационно-развлекательный проект", icon: "Info" },
  { id: "converter", name: "конвертер", topic: "Конвертер и калькуляторы трейдера: пивоты, Фибоначчи, размер позиции, прибыль, ликвидация", icon: "Hash" },
];

export const PINNED = ["bitcoin", "brent", "gold", "usd-rub", "eur-rub"];