export interface StatusLevel {
  title: string;
  need: number | null;
  icon: string;
  desc: string;
  cls: string;
  name?: string;
  text: string;
}

export const LEVELS: StatusLevel[] = [
  { title: "Новичок", need: 0, icon: "Sprout", desc: "Только начинаете знакомство с рынком", cls: "bg-slate-400/15 text-slate-300", text: "text-slate-300" },
  { title: "Наблюдатель", need: 750, icon: "Eye", desc: "Регулярно следите за котировками", cls: "bg-sky-400/15 text-sky-300", text: "text-sky-300" },
  { title: "Трейдер", need: 2250, icon: "CandlestickChart", desc: "Ведёте портфель и заходите почти каждый день", cls: "bg-teal-400/15 text-teal-300", text: "text-teal-300" },
  { title: "Аналитик", need: 5250, icon: "BrainCircuit", desc: "Глубоко в рынке уже не первый месяц", cls: "bg-violet-400/15 text-violet-300", text: "text-violet-300" },
  { title: "Кит", need: 10500, icon: "Crown", desc: "Самые преданные участники сообщества", cls: "bg-amber-400/15 text-amber-300", text: "text-amber-300" },
  {
    title: "Медведь",
    need: null,
    icon: "TrendingDown",
    desc: "Привилегированный статус — присваивает только администрация",
    cls: "bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.55)]",
    name: "text-red-500 font-semibold",
    text: "text-red-500 font-semibold",
  },
  {
    title: "Бык",
    need: null,
    icon: "TrendingUp",
    desc: "Привилегированный статус — присваивает только администрация",
    cls: "bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.55)]",
    name: "text-green-400 font-semibold",
    text: "text-green-400 font-semibold",
  },
];

export const nameCls = (level?: number, fallback = "text-white") => levelInfo(level).name ?? fallback;

export const levelInfo = (level?: number) => LEVELS[Math.min(Math.max((level ?? 1) - 1, 0), LEVELS.length - 1)];

export const isPrivileged = (level?: number) => levelInfo(level).need === null;
