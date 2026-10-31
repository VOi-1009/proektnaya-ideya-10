import { useQuery } from "@tanstack/react-query";
import func2url from "../../../backend/func2url.json";

export type NewsKind = "crypto" | "world";
export type NewsTag = string;

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

export const NEWS_TAGS: Record<NewsKind, NewsTag[]> = {
  crypto: ["Рынок", "Нефть", "Золото", "Аналитика", "Регулирование", "Технологии", "DeFi"],
  world: ["Политика", "Экономика", "В мире", "Происшествия", "Общество", "Технологии"],
};

export const NEWS_SOURCES: Record<NewsKind, string[]> = {
  crypto: ["Bits.media", "Investing.com", "Финам", "Ведомости"],
  world: ["ТАСС", "РБК", "Lenta.ru", "Ведомости"],
};

export const TAG_STYLE: Record<string, string> = {
  Рынок: "text-primary border-primary/40",
  Аналитика: "text-accent border-accent/40",
  Регулирование: "text-sky-400 border-sky-400/40",
  Технологии: "text-violet-300 border-violet-300/40",
  DeFi: "text-pink-300 border-pink-300/40",
  Нефть: "text-amber-500 border-amber-500/40",
  Золото: "text-yellow-300 border-yellow-300/40",
  Политика: "text-sky-400 border-sky-400/40",
  Экономика: "text-primary border-primary/40",
  "В мире": "text-accent border-accent/40",
  Происшествия: "text-down border-down/40",
  Общество: "text-pink-300 border-pink-300/40",
};

export const SOURCE_STYLE: Record<string, { avatar: string; cls: string }> = {
  "Bits.media": { avatar: "B", cls: "bg-sky-500 text-white" },
  "Investing.com": { avatar: "I", cls: "bg-amber-400 text-black" },
  Финам: { avatar: "Ф", cls: "bg-yellow-400 text-black" },
  ТАСС: { avatar: "Т", cls: "bg-blue-700 text-white" },
  РБК: { avatar: "Р", cls: "bg-emerald-600 text-white" },
  "Lenta.ru": { avatar: "L", cls: "bg-zinc-200 text-black" },
  Ведомости: { avatar: "В", cls: "bg-pink-700 text-white" },
};

export const NEWS_REFRESH_MS = 2 * 60_000;
const SEEN_KEY = "svecha-news-seen";

export function useNews(kind: NewsKind = "crypto") {
  return useQuery<{ items: NewsItem[]; updatedAt: number }>({
    queryKey: ["news", kind],
    queryFn: async () => {
      const r = await fetch(`${func2url.news}?kind=${kind}`);
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

const seenKey = (kind: NewsKind) => (kind === "crypto" ? SEEN_KEY : `${SEEN_KEY}-${kind}`);
export const getSeen = (kind: NewsKind = "crypto") => Number(localStorage.getItem(seenKey(kind)) ?? 0);
export const markSeen = (ts: number, kind: NewsKind = "crypto") => localStorage.setItem(seenKey(kind), String(ts));

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