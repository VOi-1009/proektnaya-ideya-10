import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface Tier {
  id: 1 | 2 | 3;
  name: string;
  icon: string;
  card: string;
  badge: string;
  btn: string;
  text: string;
  features: string[];
}

export const TIERS: Tier[] = [
  {
    id: 1,
    name: "Бронза",
    icon: "Medal",
    card: "border-orange-700/60 bg-gradient-to-b from-orange-800/20 via-card to-card",
    badge: "bg-gradient-to-r from-orange-700 to-amber-600 text-orange-50 shadow-[0_0_8px_rgba(194,120,50,0.5)]",
    btn: "bg-orange-700 hover:bg-orange-600 text-white",
    text: "text-orange-300",
    features: ["Доступ ко всем чатам", "Премиум-чат", "Значок «Бронза» у вашего имени"],
  },
  {
    id: 2,
    name: "Серебро",
    icon: "Award",
    card: "border-slate-300/50 bg-gradient-to-b from-slate-300/15 via-card to-card",
    badge: "bg-gradient-to-r from-slate-300 to-slate-500 text-slate-900 shadow-[0_0_8px_rgba(203,213,225,0.5)]",
    btn: "bg-slate-300 hover:bg-slate-200 text-slate-900",
    text: "text-slate-200",
    features: ["Всё из тарифа «Бронза»", "Доступ к форуму", "Значок «Серебро» у вашего имени"],
  },
  {
    id: 3,
    name: "Золото",
    icon: "Crown",
    card: "border-yellow-400/60 bg-gradient-to-b from-yellow-400/20 via-card to-card shadow-[0_0_24px_rgba(250,204,21,0.12)]",
    badge: "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-600 text-yellow-950 shadow-[0_0_10px_rgba(250,204,21,0.6)]",
    btn: "bg-yellow-400 hover:bg-yellow-300 text-yellow-950",
    text: "text-yellow-300",
    features: ["Всё из тарифа «Серебро»", "Рассылка сводок и дайджестов AiTraderKa на email", "Закрытый раздел «Золотой клуб» на форуме", "Значок «Золото» у вашего имени"],
  },
];

export const tierOf = (id?: number | null) => TIERS.find((t) => t.id === id);

export interface PlansData {
  plans: { prices: Record<string, number>; days: number };
  me: {
    tier: number;
    sub: { tier: number; expiresAt: string; mailOn: boolean } | null;
    last: { id: number; tier: number; status: "pending" | "approved" | "rejected"; createdAt: string } | null;
  } | null;
}

export const plansRequest = async <T,>(token: string | null, body?: object, query = ""): Promise<T> => {
  const r = await fetch(`${PROFILE_URL}?resource=plans${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const usePlans = (token: string | null) =>
  useQuery({ queryKey: ["plans", token], queryFn: () => plansRequest<PlansData>(token), staleTime: 30_000 });
