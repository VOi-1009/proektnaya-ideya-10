import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface OnlineUser {
  id: number;
  name: string;
  level: number;
  title: string;
  avatar?: string;
  founder?: number | null;
  supporter?: number | null;
  creator?: boolean;
  isAi?: boolean;
}

export interface AdminUser extends OnlineUser {
  email: string;
  points: number;
  manual: boolean;
  lastSeen: string | null;
  createdAt: string;
  isBot: boolean;
  online: boolean;
  city: string;
  bonus: number;
  bio: string;
  favoriteCoin: string;
  isAdmin: boolean;
  promo: string;
  verified?: boolean;
  autoTitle: string;
  next: number | null;
  nextTitle: string | null;
}

const URL_BASE = `${PROFILE_URL}?resource=users`;

export const usersRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${URL_BASE}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useOnline = (token: string | null) =>
  useQuery({
    queryKey: ["online", token],
    queryFn: () => usersRequest<{ online: OnlineUser[]; total: number }>(token),
    refetchInterval: 3 * 60_000,
    refetchIntervalInBackground: false,
    staleTime: 2 * 60_000,
  });

export const useVerifiedIds = () =>
  useQuery<Set<number>>({
    queryKey: ["verified-ids"],
    staleTime: 5 * 60_000,
    queryFn: async () => new Set((await usersRequest<{ ids: number[] }>(null, "&verified=1")).ids),
  });
