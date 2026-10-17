import { useQuery } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";
import { PROFILE_URL } from "@/lib/auth";

export type RadarKind = "liq_heatmap" | "link";

export interface Radar {
  id: number;
  title: string;
  color: string;
  kind: RadarKind;
  symbol: string;
  url: string;
  description: string;
  sort: number;
  published: boolean;
}

export interface Heatmap {
  symbol: string;
  range: string;
  source: string;
  priceMin: number;
  priceMax: number;
  rows: number;
  peakUsd: number;
  times: number[];
  candles: [number, number, number, number][];
  matrix: number[][];
  price: number;
  above: { price: number; usd: number; side: string }[];
  below: { price: number; usd: number; side: string }[];
  liquidatedLong: number;
  liquidatedShort: number;
  updatedAt: number;
}

export const RADAR_KINDS: { id: RadarKind; label: string; hint: string }[] = [
  { id: "liq_heatmap", label: "Тепловая карта ликвидаций", hint: "Карта по данным фьючерсов Binance / Bybit" },
  { id: "link", label: "Внешний сервис (ссылка)", hint: "Окно с кнопкой перехода на внешний сайт" },
];

export const RADAR_COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#facc15", "#f87171", "#60a5fa", "#fb923c"];

const URL_BASE = `${PROFILE_URL}?resource=radars`;

export const radarsRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${URL_BASE}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useRadars = () =>
  useQuery({
    queryKey: ["radars"],
    queryFn: () => radarsRequest<{ radars: Radar[] }>(null).then((d) => d.radars),
    staleTime: 5 * 60_000,
  });

export const useHeatmap = (symbol: string, range: string, enabled: boolean) =>
  useQuery({
    queryKey: ["heatmap", symbol, range],
    enabled,
    queryFn: async () => {
      const r = await fetch(`${func2url.news}?resource=heatmap&symbol=${symbol}&range=${range}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.matrix) throw new Error(d.error ?? "Карта временно недоступна");
      return d as Heatmap;
    },
    refetchInterval: 60_000,
    staleTime: 50_000,
  });

export const fmtUsd = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(2)} млрд` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)} млн` : `$${Math.round(v / 1e3)} тыс`;
