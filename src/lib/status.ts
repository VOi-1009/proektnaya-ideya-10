export interface StatusLevel {
  title: string;
  need: number | null;
  icon: string;
  desc: string;
  cls: string;
  name?: string;
  text: string;
  color: string;
}

export const LEVELS: StatusLevel[] = [
  { title: "Новичок", need: 0, icon: "Sprout", desc: "Только начинаете знакомство с рынком", cls: "bg-[#FBBF24]/15 text-[#FBBF24]", text: "text-[#FBBF24]", color: "#FBBF24" },
  { title: "Студент", need: 300, icon: "GraduationCap", desc: "Освоились на сайте и изучаете рынок", cls: "bg-[#6366F1]/15 text-[#6366F1]", text: "text-[#6366F1]", color: "#6366F1" },
  { title: "Наблюдатель", need: 750, icon: "Eye", desc: "Регулярно следите за котировками", cls: "bg-[#A3E635]/15 text-[#A3E635]", text: "text-[#A3E635]", color: "#A3E635" },
  { title: "Трейдер", need: 2250, icon: "CandlestickChart", desc: "Ведёте портфель и заходите почти каждый день", cls: "bg-[#38BDF8]/15 text-[#38BDF8]", text: "text-[#38BDF8]", color: "#38BDF8" },
  { title: "Аналитик", need: 5250, icon: "BrainCircuit", desc: "Глубоко в рынке уже не первый месяц", cls: "bg-[#D946EF]/15 text-[#D946EF]", text: "text-[#D946EF]", color: "#D946EF" },
  { title: "Кит", need: 10500, icon: "Crown", desc: "Самые преданные участники сообщества", cls: "bg-[#A78BFA]/15 text-[#A78BFA]", text: "text-[#A78BFA]", color: "#A78BFA" },
  {
    title: "Медведь",
    need: null,
    icon: "TrendingDown",
    desc: "Привилегированный статус — присваивает только администрация",
    cls: "bg-[#EF4444] text-white shadow-[0_0_10px_rgba(239,68,68,0.55)]",
    name: "text-[#EF4444] font-semibold",
    text: "text-[#EF4444] font-semibold",
    color: "#EF4444",
  },
  {
    title: "Бык",
    need: null,
    icon: "TrendingUp",
    desc: "Привилегированный статус — присваивает только администрация",
    cls: "bg-[#22C55E] text-black shadow-[0_0_10px_rgba(34,197,94,0.55)]",
    name: "text-[#22C55E] font-semibold",
    text: "text-[#22C55E] font-semibold",
    color: "#22C55E",
  },
];

export const nameCls = (level?: number, fallback = "text-white") => levelInfo(level).name ?? fallback;

export const levelInfo = (level?: number) => LEVELS[Math.min(Math.max((level ?? 1) - 1, 0), LEVELS.length - 1)];

export const isPrivileged = (level?: number) => levelInfo(level).need === null;

export const statusColor = (level?: number) => levelInfo(level).color;
