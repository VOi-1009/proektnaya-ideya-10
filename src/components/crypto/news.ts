import { useQuery } from "@tanstack/react-query";
import func2url from "../../../backend/func2url.json";

export type NewsTag = "Рынок" | "Регулирование" | "Технологии" | "Аналитика" | "DeFi";

export interface NewsItem {
  id: string;
  tag: NewsTag;
  title: string;
  text: string;
  link: string;
  image: string;
  source: string;
  author: string;
  ts: number;
  coins: string[];
}

export const NEWS_TAGS: NewsTag[] = ["Рынок", "Аналитика", "Регулирование", "Технологии", "DeFi"];

export const TAG_STYLE: Record<NewsTag, string> = {
  Рынок: "text-primary border-primary/40",
  Аналитика: "text-accent border-accent/40",
  Регулирование: "text-sky-400 border-sky-400/40",
  Технологии: "text-violet-300 border-violet-300/40",
  DeFi: "text-pink-300 border-pink-300/40",
};

export const SOURCE_STYLE: Record<string, { avatar: string; cls: string }> = {
  ForkLog: { avatar: "F", cls: "bg-orange-500 text-white" },
  "Bits.media": { avatar: "B", cls: "bg-sky-500 text-white" },
};

export const NEWS_REFRESH_MS = 2 * 60_000;
const SEEN_KEY = "svecha-news-seen";

export function useNews() {
  return useQuery<{ items: NewsItem[]; updatedAt: number }>({
    queryKey: ["news"],
    queryFn: async () => {
      const r = await fetch(func2url.news);
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(data.items)) throw new Error(data.error ?? "Не удалось загрузить новости");
      return { items: data.items, updatedAt: data.updatedAt ?? Date.now() };
    },
    refetchInterval: NEWS_REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: 60_000,
    retry: 2,
  });
}

export const getSeen = () => Number(localStorage.getItem(SEEN_KEY) ?? 0);
export const markSeen = (ts: number) => localStorage.setItem(SEEN_KEY, String(ts));

export const fmtNewsTime = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.round((now.getTime() - ts) / 60000);
  const hm = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин назад`;
  if (d.toDateString() === now.toDateString()) return `Сегодня в ${hm}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Вчера в ${hm}`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + ` в ${hm}`;
};
