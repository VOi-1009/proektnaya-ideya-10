import { useQuery } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";

export interface CmcMetrics {
  treasuries?: { total: number; companies: number; top: { name: string; holdings: number } | null };
  altseason?: { value: number | null; yesterday: number | null; lastWeek: number | null; lastMonth: number | null };
  liquidations?: { total: number | null; change24h: number | null; longs: number | null; shorts: number | null };
  etf?: { points: { t: number; btc: number; eth: number; total: number }[]; total: number; totalBtc: number; totalEth: number };
  social?: { value: number | null; percent: number | null; yesterday: number | null; lastWeek: number | null; yearHigh: number | null; yearLow: number | null };
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

export const sentimentLabel = (v: number) => (v >= 3 ? "Очень позитивное" : v >= 0.5 ? "Позитивное" : v > -0.5 ? "Нейтральное" : v > -3 ? "Негативное" : "Очень негативное");
