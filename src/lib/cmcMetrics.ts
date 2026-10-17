import { useQuery } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";

export interface CmcMetrics {
  treasuries?: { total: number; companies: number; top: { name: string; holdings: number } | null };
  altseason?: { value: number | null; yesterday: number | null; lastWeek: number | null; lastMonth: number | null };
  liquidations?: { total: number | null; change24h: number | null; longs: number | null; shorts: number | null };
  updatedAt: number;
}

export const useCmcMetrics = () =>
  useQuery({
    queryKey: ["cmc-metrics"],
    queryFn: async () => {
      const r = await fetch(`${func2url.news}?resource=cmc`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Данные временно недоступны");
      return d as CmcMetrics;
    },
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  });

export const altLabel = (v: number) => (v >= 75 ? "Сезон альткоинов" : v <= 25 ? "Сезон биткоина" : "Нейтрально");
