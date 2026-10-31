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
  { title: "Скальпер", need: 1000, icon: "Zap", desc: "Ловите быстрые движения и заходите каждый день", cls: "bg-[#2DD4BF]/15 text-[#2DD4BF]", text: "text-[#2DD4BF]", color: "#2DD4BF" },
  { title: "Свингер", need: 1500, icon: "Waves", desc: "Держите идеи на несколько дней и следите за трендом", cls: "bg-[#22D3EE]/15 text-[#22D3EE]", text: "text-[#22D3EE]", color: "#22D3EE" },
  { title: "Стратег", need: 2500, icon: "Target", desc: "Действуете по плану и ведёте портфель", cls: "bg-[#FB923C]/15 text-[#FB923C]", text: "text-[#FB923C]", color: "#FB923C" },
  { title: "Рыночный волк", need: 3500, icon: "Swords", desc: "Опытный игрок, который знает рынок изнутри", cls: "bg-[#F43F5E]/15 text-[#F43F5E]", text: "text-[#F43F5E]", color: "#F43F5E" },
  { title: "Трейдер", need: 5000, icon: "CandlestickChart", desc: "Ведёте портфель и заходите почти каждый день", cls: "bg-[#38BDF8]/15 text-[#38BDF8]", text: "text-[#38BDF8]", color: "#38BDF8" },
  { title: "Аналитик", need: 7500, icon: "BrainCircuit", desc: "Глубоко в рынке уже не первый месяц", cls: "bg-[#D946EF]/15 text-[#D946EF]", text: "text-[#D946EF]", color: "#D946EF" },
  { title: "Кит", need: 10000, icon: "Crown", desc: "Самые преданные участники сообщества", cls: "bg-[#A78BFA]/15 text-[#A78BFA]", text: "text-[#A78BFA]", color: "#A78BFA" },
  {
    title: "Модератор",
    need: null,
    icon: "ShieldCheck",
    desc: "Следит за порядком на сайте — присваивает только администрация",
    cls: "bg-[#0EA5E9] text-white shadow-[0_0_10px_rgba(14,165,233,0.55)]",
    name: "text-[#0EA5E9] font-semibold",
    text: "text-[#0EA5E9] font-semibold",
    color: "#0EA5E9",
  },
  {
    title: "Администрация",
    need: null,
    icon: "BadgeCheck",
    desc: "Главный статус на сайте — присваивается только владельцем",
    cls: "bg-[#FACC15] text-black shadow-[0_0_12px_rgba(250,204,21,0.65)]",
    name: "text-[#FACC15] font-bold",
    text: "text-[#FACC15] font-bold",
    color: "#FACC15",
  },
];

export const TEAMS = {
  bull: { title: "Быки", icon: "TrendingUp", cls: "bg-[#22C55E] text-black shadow-[0_0_10px_rgba(34,197,94,0.55)]", text: "text-[#22C55E]", color: "#22C55E", desc: "Верят в рост рынка" },
  bear: { title: "Медведи", icon: "TrendingDown", cls: "bg-[#EF4444] text-white shadow-[0_0_10px_rgba(239,68,68,0.55)]", text: "text-[#EF4444]", color: "#EF4444", desc: "Ждут снижения рынка" },
} as const;

export type Team = keyof typeof TEAMS;

export const TEAM_CHANGE_PRICE = 100;

export const nameCls = (level?: number, fallback = "text-white") => levelInfo(level).name ?? fallback;

export const levelInfo = (level?: number) => LEVELS[Math.min(Math.max((level ?? 1) - 1, 0), LEVELS.length - 1)];

export const isPrivileged = (level?: number) => levelInfo(level).need === null;

export const statusColor = (level?: number) => levelInfo(level).color;
