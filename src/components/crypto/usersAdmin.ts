export const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

export const ago = (iso: string | null) => {
  if (!iso) return "ещё не заходил";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 5) return "в сети";
  if (m < 60) return `${m} мин назад`;
  if (m < 1440) return `${Math.round(m / 60)} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
};

export type BotForm = {
  id?: number;
  name: string;
  city: string;
  level: string;
  avatar?: string;
};

export const EMPTY_BOT: BotForm = { name: "", city: "", level: "3" };
