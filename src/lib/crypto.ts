import { useQuery } from "@tanstack/react-query";

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
}

export const COIN_IDS = [
  "bitcoin",
  "ethereum",
  "binancecoin",
  "ripple",
  "solana",
  "the-open-network",
  "dogecoin",
  "cardano",
];

export const COIN_META: Record<string, { ru: string; color: string; short: string }> = {
  bitcoin: { ru: "Биткоин", color: "#f7931a", short: "BTC" },
  ethereum: { ru: "Эфириум", color: "#8c8cf7", short: "ETH" },
  binancecoin: { ru: "BNB", color: "#f3ba2f", short: "BNB" },
  ripple: { ru: "XRP", color: "#3b9cf2", short: "XRP" },
  solana: { ru: "Солана", color: "#14f195", short: "SOL" },
  "the-open-network": { ru: "Тон", color: "#0098ea", short: "TON" },
  dogecoin: { ru: "Догикоин", color: "#c2a633", short: "DOGE" },
  cardano: { ru: "Кардано", color: "#4f7cff", short: "ADA" },
};

// Резервные данные на случай, если биржевой источник временно недоступен
const FALLBACK: Array<[string, string, string, number, number, number]> = [
  ["bitcoin", "btc", "Bitcoin", 81389, -1.17, 1635876549695],
  ["ethereum", "eth", "Ethereum", 2433.71, -0.19, 297271506135],
  ["binancecoin", "bnb", "BNB", 723.5, -1.22, 96351948331],
  ["ripple", "xrp", "XRP", 1.31, -2.13, 82593709005],
  ["solana", "sol", "Solana", 104.04, -1.7, 61326063653],
  ["the-open-network", "ton", "Toncoin", 1.36, -0.92, 3849909372],
  ["dogecoin", "doge", "Dogecoin", 0.08045, -0.97, 12573739539],
  ["cardano", "ada", "Cardano", 0.224715, -2.33, 8438702627],
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

export function useMarkets() {
  return useQuery<{ coins: Coin[]; live: boolean }>({
    queryKey: ["markets"],
    queryFn: async () => {
      try {
        const r = await fetch(
          `${API}/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(",")}&sparkline=true&price_change_percentage=1h,24h,7d`
        );
        if (!r.ok) throw new Error("bad");
        const data = (await r.json()) as Coin[];
        if (!Array.isArray(data) || !data.length) throw new Error("empty");
        return { coins: data, live: true };
      } catch {
        return { coins: fallbackCoins(), live: false };
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export type ChartPoint = { t: number; p: number };

export async function fetchChart(id: string, days: number, fallbackPrice?: number): Promise<ChartPoint[]> {
  try {
    const r = await fetch(`${API}/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
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

export const fmtPrice = (v: number) => {
  const digits = v >= 1000 ? 0 : v >= 1 ? 2 : v >= 0.01 ? 4 : 6;
  return "$" + v.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
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