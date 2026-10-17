export interface StatusLevel {
  title: string;
  need: number | null;
  icon: string;
  desc: string;
  cls: string;
  name?: string;
}

export const LEVELS: StatusLevel[] = [
  { title: "Новичок", need: 0, icon: "Sprout", desc: "Только начинаете знакомство с рынком", cls: "bg-white/10 text-muted-foreground" },
  { title: "Наблюдатель", need: 750, icon: "Eye", desc: "Регулярно следите за котировками", cls: "bg-sky-400/15 text-sky-300" },
  { title: "Трейдер", need: 2250, icon: "CandlestickChart", desc: "Ведёте портфель и заходите почти каждый день", cls: "bg-up/15 text-up" },
  { title: "Аналитик", need: 5250, icon: "BrainCircuit", desc: "Глубоко в рынке уже не первый месяц", cls: "bg-violet-400/15 text-violet-300" },
  { title: "Кит", need: 10500, icon: "Crown", desc: "Самые преданные участники сообщества", cls: "bg-primary/15 text-primary" },
  {
    title: "Медведь",
    need: null,
    icon: "TrendingDown",
    desc: "Привилегированный статус — присваивает только администрация",
    cls: "bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.55)]",
    name: "text-red-500 font-semibold",
  },
  {
    title: "Бык",
    need: null,
    icon: "TrendingUp",
    desc: "Привилегированный статус — присваивает только администрация",
    cls: "bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.55)]",
    name: "text-green-400 font-semibold",
  },
];

export const nameCls = (level?: number, fallback = "text-white") => levelInfo(level).name ?? fallback;

export const levelInfo = (level?: number) => LEVELS[Math.min(Math.max((level ?? 1) - 1, 0), LEVELS.length - 1)];

export const isPrivileged = (level?: number) => levelInfo(level).need === null;
