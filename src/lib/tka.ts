import { useQuery } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";

export const TRADING_URL = func2url.trading;

export const tka = (v: number, sign = false) =>
  `${sign && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TKA`;

export interface Wallet {
  free: number;
  locked: number;
  total: number;
  ledger: { amount: number; kind: string; note: string; at: string }[];
  usdt?: { free: number; locked: number; total: number };
}

export const useWallet = (token: string | null) =>
  useQuery<Wallet>({
    queryKey: ["tka-wallet", token],
    enabled: !!token,
    staleTime: 30_000,
    queryFn: async () => {
      const r = await fetch(`${TRADING_URL}?action=wallet`, { headers: { "X-Auth-Token": token ?? "" } });
      if (!r.ok) throw new Error("bad");
      return r.json();
    },
  });

export interface Daily {
  claimed: boolean;
  streak: number;
  nextDay: number;
  reward: number;
  tomorrow: number;
  rewards: number[];
  got?: number;
}

export const useDaily = (token: string | null) =>
  useQuery<Daily>({
    queryKey: ["tka-daily", token],
    enabled: !!token,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await fetch(`${TRADING_URL}?action=daily`, { headers: { "X-Auth-Token": token ?? "" } });
      if (!r.ok) throw new Error("bad");
      return r.json();
    },
  });
