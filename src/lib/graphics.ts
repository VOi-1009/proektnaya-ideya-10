import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fundRequest } from "@/lib/fund";
import { QUICK_EMOJI } from "@/lib/community";

export interface GraphicsSettings {
  logo: string;
  favicon: string;
  appIcon: string;
  emoji: string[];
  cardColors: Record<CardKey, string>;
}

export type CardKey = "cap" | "best" | "worst" | "volume" | "best7d" | "liq" | "long" | "short" | "outflow";

export const CARD_LABELS: Record<CardKey, string> = {
  cap: "Капитализация крипто",
  best: "Сильнее рынка",
  worst: "Аутсайдер",
  volume: "Объём торгов за 24ч",
  best7d: "Лучший за 7 дней",
  liq: "Объём ликвидаций 24h",
  long: "Лонг",
  short: "Шорт",
  outflow: "Больший отток за 24ч",
};

export const CARD_DEFAULTS: Record<CardKey, string> = {
  cap: "#FBBF24",
  best: "#A3E635",
  worst: "#D946EF",
  volume: "#2DD4BF",
  best7d: "#F472B6",
  liq: "#38BDF8",
  long: "#22C55E",
  short: "#EF4444",
  outflow: "#38BDF8",
};

export const PALETTE: { name: string; hex: string }[] = [
  { name: "Янтарный", hex: "#FBBF24" },
  { name: "Голубой", hex: "#38BDF8" },
  { name: "Зелёный", hex: "#22C55E" },
  { name: "Красный", hex: "#EF4444" },
  { name: "Фиолетовый", hex: "#A78BFA" },
  { name: "Лайм", hex: "#A3E635" },
  { name: "Индиго", hex: "#6366F1" },
  { name: "Пурпурный", hex: "#D946EF" },
  { name: "Бирюзовый", hex: "#2DD4BF" },
  { name: "Розовый", hex: "#F472B6" },
];

export const useGraphics = () =>
  useQuery<GraphicsSettings>({
    queryKey: ["graphics-settings"],
    staleTime: 5 * 60_000,
    queryFn: async () => (await fundRequest<{ settings: GraphicsSettings }>(null, "?action=graphics_settings")).settings,
  });

export const useCardColors = (): Record<CardKey, string> => {
  const { data } = useGraphics();
  return { ...CARD_DEFAULTS, ...(data?.cardColors ?? {}) };
};

export const useEmojiList = () => {
  const { data } = useGraphics();
  return data?.emoji?.length ? data.emoji : QUICK_EMOJI;
};

export const useFaviconSync = () => {
  const { data } = useGraphics();
  useEffect(() => {
    if (!data?.favicon) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.removeAttribute("type");
    link.href = data.favicon;
  }, [data?.favicon]);
};
