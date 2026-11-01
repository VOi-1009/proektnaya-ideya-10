import { useQuery } from "@tanstack/react-query";
import { TRADING_URL } from "@/lib/tka";

export interface FundOp {
  amount: number;
  kind: string;
  note: string;
  at: string;
}

export interface Fund {
  total: number;
  count: number;
  donors: number;
  mine: number;
  rate: number;
  title: string;
  description: string;
  goal: number;
  last: FundOp[];
  top: { name: string; amount: number }[];
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
