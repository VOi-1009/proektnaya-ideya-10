import { useQuery } from "@tanstack/react-query";
import { TRADING_URL } from "@/lib/tka";

export interface FundOp {
  amount: number;
  kind: string;
  note: string;
  at: string;
  user?: string;
}

export interface Fund {
  total: number;
  count: number;
  donors: number;
  mine: number;
  feesPaid?: number;
  feesTrades?: number;
  feesExchange?: number;
  rate: number;
  title: string;
  description: string;
  goal: number;
  last: FundOp[];
  top: { name: string; amount: number }[];
  chart: { d: string; total: number; in: number }[];
  winners: { id: number; title: string; prize: number; at: string | null; name: string; userId: number; avatar: string }[];
}

export interface FundSettings {
  title: string;
  description: string;
  goal: number;
  feePercent: number;
}

export const fundFmt = (v: number) => v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fundRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${TRADING_URL}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Не удалось связаться с сервером");
  return d as T;
};

export const useFund = (token: string | null) =>
  useQuery<Fund>({
    queryKey: ["tka-fund", token],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: () => fundRequest<Fund>(token, "?action=fund"),
  });

export interface Contest {
  id: number;
  title: string;
  description: string;
  kind: "random" | "trader";
  prize: number;
  status: "active" | "finished" | "cancelled";
  startsAt: string;
  endsAt: string;
  winnerId: number | null;
  winner: string;
  entries: number;
  joined: boolean;
}

export const CONTEST_KIND: Record<string, string> = {
  random: "Розыгрыш среди участников",
  trader: "Лучший трейдер",
};

export const CONTEST_KIND_HINT: Record<string, string> = {
  random: "Победитель выбирается случайно среди записавшихся.",
  trader: "Побеждает участник с наибольшей прибылью по закрытым сделкам на бирже за время конкурса (в виртуальных USDT).",
};

export const useContests = (token: string | null) =>
  useQuery<{ contests: Contest[]; available: number }>({
    queryKey: ["contests", token],
    staleTime: 20_000,
    refetchInterval: 60_000,
    queryFn: () => fundRequest(token, "?action=contests"),
  });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export const FUND_TIERS = [
  { id: "first", title: "Первый взнос", need: 0.01, icon: "Sprout", color: "from-emerald-300 to-green-600" },
  { id: "backer", title: "Вкладчик", need: 1, icon: "PiggyBank", color: "from-sky-300 to-blue-600" },
  { id: "patron", title: "Меценат", need: 10, icon: "HeartHandshake", color: "from-pink-300 to-rose-600" },
  { id: "pillar", title: "Столп фонда", need: 50, icon: "Landmark", color: "from-amber-300 via-yellow-400 to-orange-500" },
];

export const fundTierOf = (amount: number) => [...FUND_TIERS].reverse().find((t) => amount >= t.need) ?? null;

export const useFundDonors = () =>
  useQuery<Record<string, number>>({
    queryKey: ["fund-donors"],
    staleTime: 5 * 60_000,
    queryFn: async () => (await fundRequest<{ donors: Record<string, number> }>(null, "?action=fund_donors")).donors,
  });

export interface ExchangeSettings {
  enabled: boolean;
  message: string;
  maxLeverage: number;
  minMargin: number;
  feePercent: number;
  feeBase: "volume" | "margin";
  disabledCoins: string[];
}

export const EX_DEFAULT: ExchangeSettings = { enabled: true, message: "", maxLeverage: 100, minMargin: 1, feePercent: 0.05, feeBase: "volume", disabledCoins: [] };

export const useExchangeSettings = () =>
  useQuery<ExchangeSettings>({
    queryKey: ["exchange-settings"],
    staleTime: 60_000,
    queryFn: () => fundRequest<ExchangeSettings>(null, "?action=exchange_settings"),
  });

export const tradeFee = (ex: ExchangeSettings, margin: number, leverage: number) =>
  Math.round((ex.feeBase === "volume" ? margin * leverage : margin) * ex.feePercent * 100) / 10000;
