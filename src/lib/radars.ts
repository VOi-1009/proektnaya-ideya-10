import { useQuery } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";
import { PROFILE_URL } from "@/lib/auth";

export type RadarKind = "liq_heatmap" | "top_txs" | "ex_flows" | "link" | "page";

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
  pageTitle: string;
  pageHtml: string;
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
  { id: "top_txs", label: "ТОП по количеству сделок", hint: "10 криптовалют с наибольшим числом транзакций" },
  { id: "ex_flows", label: "Притоки и оттоки на биржах", hint: "Чистые потоки активов на криптобиржи за 24 часа, 7 и 30 дней (CoinMarketCap)" },
  { id: "page", label: "Своя страница", hint: "Заголовок и оформленный текст / HTML-код прямо на сайте" },
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

export interface LiqBar {
  price: number;
  long: number;
  short: number;
  cumLong?: number;
  cumShort?: number;
}

export interface LiqLevel {
  price: number;
  usd: number;
  pct: number;
}

export interface LiqMap {
  keyAbove: LiqLevel | null;
  keyBelow: LiqLevel | null;
  magnet: LiqLevel | null;
  symbol: string;
  range: string;
  source: string;
  price: number;
  bars: LiqBar[];
  totalLong: number;
  totalShort: number;
  updatedAt: number;
}

export type LevGroup = "all" | "high" | "low";

export const useLiqMap = (symbol: string, range: string, lev: LevGroup, enabled: boolean) =>
  useQuery({
    queryKey: ["liqmap", symbol, range, lev],
    enabled,
    queryFn: async () => {
      const r = await fetch(`${func2url.news}?resource=liqmap&symbol=${symbol}&range=${range}&lev=${lev}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.bars) throw new Error(d.error ?? "Карта временно недоступна");
      return d as LiqMap;
    },
    refetchInterval: 60_000,
    staleTime: 50_000,
  });

export const fmtUsd = (v: number) =>
  v >= 1e12 ? `$${(v / 1e12).toFixed(2)} трлн` : v >= 1e9 ? `$${(v / 1e9).toFixed(2)} млрд` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)} млн` : `$${Math.round(v / 1e3)} тыс`;

export interface TopTx {
  place: number;
  symbol: string;
  name: string;
  logo: string;
  txs: number;
  price: number;
  change: number;
  marketCap: number;
  volume: number;
  rank: number;
}

export const useTopTxs = (enabled: boolean) =>
  useQuery({
    queryKey: ["top-txs"],
    enabled,
    queryFn: async () => {
      const r = await fetch(`${func2url.news}?resource=toptxs`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(d.items)) throw new Error(d.error ?? "Данные временно недоступны");
      return d as { items: TopTx[]; updatedAt: number };
    },
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  });

export interface ExchangeFlow {
  name: string;
  slug: string;
  id: number | null;
  rank: number | null;
  assets: number;
  oi: number;
  flow24h: number;
  flow7d: number;
  flow30d: number;
}

export interface ExchangeFlows {
  items: ExchangeFlow[];
  total24h: number;
  total7d: number;
  total30d: number;
  updatedAt: number;
}

export const useExchangeFlows = (enabled: boolean) =>
  useQuery({
    queryKey: ["exflows"],
    enabled,
    queryFn: async () => {
      const r = await fetch(`${func2url.news}?resource=exflows`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.items) throw new Error(d.error ?? "Данные временно недоступны");
      return d as ExchangeFlows;
    },
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  });
