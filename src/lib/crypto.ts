import { useQuery } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
  kind?: "commodity";
  quote?: "USD" | "RUB";
}

export const COIN_IDS = [
  "bitcoin",
  "ethereum",
  "binancecoin",
  "ripple",
  "solana",
  "dogecoin",
  "hyperliquid",
  "zcash",
];

export const COMMODITY_IDS = ["brent", "gold", "usd-rub", "eur-rub"];
export const FX_IDS = ["usd-rub", "eur-rub"];
export const isFx = (id: string) => FX_IDS.includes(id);
export const isCommodity = (id: string) => COMMODITY_IDS.includes(id);

export const COIN_META: Record<string, { ru: string; color: string; short: string }> = {
  bitcoin: { ru: "Bitcoin", color: "#f7931a", short: "BTC" },
  ethereum: { ru: "Ethereum", color: "#8c8cf7", short: "ETH" },
  binancecoin: { ru: "BNB", color: "#f3ba2f", short: "BNB" },
  ripple: { ru: "XRP", color: "#3b9cf2", short: "XRP" },
  solana: { ru: "Solana", color: "#14f195", short: "SOL" },
  dogecoin: { ru: "Dogecoin", color: "#c2a633", short: "DOGE" },
  hyperliquid: { ru: "Hyperliquid", color: "#50d2c1", short: "HYPE" },
  zcash: { ru: "Zcash", color: "#f4b728", short: "ZEC" },
  brent: { ru: "BRENT", color: "#3d3d3d", short: "BRENT" },
  gold: { ru: "Gold", color: "#d4af37", short: "GOLD" },
  "usd-rub": { ru: "USD/RUB", color: "#2f855a", short: "USD/RUB" },
  "eur-rub": { ru: "EUR/RUB", color: "#2b6cb0", short: "EUR/RUB" },
};

// Резервные данные на случай, если биржевой источник временно недоступен
const FALLBACK: Array<[string, string, string, number, number, number]> = [
  ["bitcoin", "btc", "Bitcoin", 81389, -1.17, 1635876549695],
  ["ethereum", "eth", "Ethereum", 2433.71, -0.19, 297271506135],
  ["binancecoin", "bnb", "BNB", 723.5, -1.22, 96351948331],
  ["ripple", "xrp", "XRP", 1.31, -2.13, 82593709005],
  ["solana", "sol", "Solana", 104.04, -1.7, 61326063653],
  ["dogecoin", "doge", "Dogecoin", 0.08045, -0.97, 12573739539],
  ["hyperliquid", "hype", "Hyperliquid", 77.98, -2.82, 17347205579],
  ["zcash", "zec", "Zcash", 1114.28, -2.37, 18932508680],
  ["brent", "brent", "BRENT", 109.86, 3.72, 0],
  ["gold", "xau", "Gold", 4181.1, 0.26, 0],
  ["usd-rub", "usd", "USD/RUB", 83.46, -0.48, 0],
  ["eur-rub", "eur", "EUR/RUB", 93.83, -0.29, 0],
];

function synthSeries(base: number, n: number, seed: number, drift = 0) {
  const out: number[] = [];
  let v = base * (1 - drift);
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280 - 0.5;
    v = v * (1 + r * 0.012) + (base - v) * 0.02;
    out.push(v);
  }
  out[n - 1] = base;
  return out;
}

const fallbackCoins = (): Coin[] =>
  FALLBACK.map(([id, symbol, name, price, ch, cap], i) => ({
    id,
    symbol,
    name,
    image: "",
    kind: isCommodity(id) ? ("commodity" as const) : undefined,
    quote: isFx(id) ? ("RUB" as const) : ("USD" as const),
    current_price: price,
    market_cap: cap,
    total_volume: cap * 0.04,
    high_24h: price * 1.02,
    low_24h: price * 0.975,
    price_change_percentage_24h: ch,
    price_change_percentage_1h_in_currency: ch / 12,
    price_change_percentage_7d_in_currency: ch * 2.4,
    sparkline_in_7d: { price: synthSeries(price, 168, i * 77 + 13, ch / 50) },
  }));

const API = "https://api.coingecko.com/api/v3";
const NEWS_API = func2url.news;

const loadCommodities = async (): Promise<Coin[]> => {
  try {
    const r = await fetch(`${NEWS_API}?resource=commodities`);
    if (!r.ok) throw new Error("bad");
    const data = await r.json();
    return Array.isArray(data.items) && data.items.length ? data.items : fallbackCoins().filter((c) => c.kind);
  } catch {
    return fallbackCoins().filter((c) => c.kind);
  }
};

export function useMarkets() {
  return useQuery<{ coins: Coin[]; live: boolean }>({
    queryKey: ["markets"],
    queryFn: async () => {
      const commodities = loadCommodities();
      try {
        const r = await fetch(
          `${API}/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(",")}&sparkline=true&price_change_percentage=1h,24h,7d`
        );
        if (!r.ok) throw new Error("bad");
        const data = (await r.json()) as Coin[];
        if (!Array.isArray(data) || !data.length) throw new Error("empty");
        return { coins: [...data, ...(await commodities)], live: true };
      } catch {
        return { coins: [...fallbackCoins().filter((c) => !c.kind), ...(await commodities)], live: false };
      }
    },
    refetchInterval: 3 * 60_000,
    refetchIntervalInBackground: false,
    staleTime: 2 * 60_000,
  });
}

export type ChartPoint = { t: number; p: number };

export async function fetchChart(id: string, days: number, fallbackPrice?: number): Promise<ChartPoint[]> {
  try {
    const r = await fetch(
      isCommodity(id)
        ? `${NEWS_API}?resource=chart&id=${id}&days=${days}`
        : `${API}/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
    );
    if (!r.ok) throw new Error("bad");
    const data = (await r.json()) as { prices: [number, number][] };
    return data.prices.map(([t, p]) => ({ t, p }));
  } catch {
    const n = 120;
    const now = Date.now();
    const step = (days * 86400000) / n;
    const base = fallbackPrice ?? 100;
    return synthSeries(base, n, id.length * 31 + days, 0.04).map((p, i) => ({
      t: now - (n - i) * step,
      p,
    }));
  }
}

export function useChart(id: string, days: number, fallbackPrice?: number) {
  return useQuery<ChartPoint[]>({
    queryKey: ["chart", id, days],
    queryFn: () => fetchChart(id, days, fallbackPrice),
    staleTime: 60_000,
  });
}

export const fmtPrice = (v: number, id?: string) => {
  if (id && isFx(id)) return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
  const digits = v >= 1000 ? 0 : v >= 1 ? 2 : v >= 0.01 ? 4 : 6;
  return "$" + v.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export const fmtRub = (v: number) => {
  const digits = v >= 1000 ? 0 : v >= 1 ? 2 : 4;
  return v.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + " ₽";
};

export const fmtBig = (v: number) => {
  if (v >= 1e12) return "$" + (v / 1e12).toFixed(2).replace(".", ",") + " трлн";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1).replace(".", ",") + " млрд";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1).replace(".", ",") + " млн";
  return "$" + v.toLocaleString("ru-RU");
};

export const fmtPct = (v?: number) => {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return (v > 0 ? "+" : "") + v.toFixed(2).replace(".", ",") + "%";
};