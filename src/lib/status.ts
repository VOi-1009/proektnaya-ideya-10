export interface StatusLevel {
  title: string;
  need: number | null;
  icon: string;
  desc: string;
  cls: string;
}

export const LEVELS: StatusLevel[] = [
  { title: "Новичок", need: 0, icon: "Sprout", desc: "Только начинаете знакомство с рынком", cls: "bg-white/10 text-muted-foreground" },
  { title: "Наблюдатель", need: 50, icon: "Eye", desc: "Регулярно следите за котировками", cls: "bg-sky-400/15 text-sky-300" },
  { title: "Трейдер", need: 150, icon: "CandlestickChart", desc: "Ведёте портфель и заходите почти каждый день", cls: "bg-up/15 text-up" },
  { title: "Аналитик", need: 350, icon: "BrainCircuit", desc: "Глубоко в рынке уже не первый месяц", cls: "bg-violet-400/15 text-violet-300" },
  { title: "Кит", need: 700, icon: "Crown", desc: "Самые преданные участники сообщества", cls: "bg-primary/15 text-primary" },
  {
    title: "Медведь",
    need: null,
    icon: "Gem",
    desc: "Привилегированный статус — присваивает только администрация",
    cls: "bg-gradient-to-r from-amber-400 to-orange-500 text-black",
  },
];

export const levelInfo = (level?: number) => LEVELS[Math.min(Math.max((level ?? 1) - 1, 0), LEVELS.length - 1)];
