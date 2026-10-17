import { useQuery } from "@tanstack/react-query";

export interface FearGreed {
  value: number;
  prev: number | null;
  label: string;
}

const RU: Record<string, string> = {
  "Extreme Fear": "Сильный страх",
  Fear: "Страх",
  Neutral: "Нейтрально",
  Greed: "Жадность",
  "Extreme Greed": "Сильная жадность",
};

export const fgColor = (v: number) =>
  v < 25 ? "text-down" : v < 45 ? "text-orange-400" : v < 56 ? "text-accent" : v < 75 ? "text-lime-400" : "text-up";

export const fgBorder = (v: number) =>
  v < 25 ? "border-down" : v < 45 ? "border-orange-400" : v < 56 ? "border-accent" : v < 75 ? "border-lime-400" : "border-up";

export const useFearGreed = () =>
  useQuery<FearGreed>({
    queryKey: ["fear-greed"],
    queryFn: async () => {
      const r = await fetch("https://api.alternative.me/fng/?limit=2");
      const d = await r.json();
      const [now, prev] = d.data ?? [];
      if (!now) throw new Error("Индекс недоступен");
      return {
        value: Number(now.value),
        prev: prev ? Number(prev.value) : null,
        label: RU[now.value_classification] ?? now.value_classification,
      };
    },
    staleTime: 30 * 60_000,
    refetchInterval: 60 * 60_000,
    retry: 1,
  });
