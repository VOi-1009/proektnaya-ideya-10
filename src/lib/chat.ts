import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL, useAuth } from "@/lib/auth";

export type ChatRoom = string;

export interface ChatMessage {
  id: number;
  text: string;
  createdAt: string;
  mine: boolean;
  user: { id: number; name: string; avatar: string; level: number; supporter?: number | null; creator?: boolean; isBot?: boolean; isAi?: boolean };
}

export interface ChatRoomInfo {
  id: string;
  name: string;
  topic: string;
  color: string;
  access: "all" | "level" | "list";
  minLevel: number;
  sort: number;
  canEnter?: boolean;
}

export const CHAT_COLORS: Record<string, { label: string; dot: string; btn: string; active: string }> = {
  emerald: { label: "Зелёный", dot: "bg-emerald-300", btn: "bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20", active: "bg-emerald-400/25 text-emerald-100" },
  rose: { label: "Красный", dot: "bg-rose-300", btn: "bg-rose-400/10 text-rose-200 hover:bg-rose-400/20", active: "bg-rose-400/25 text-rose-100" },
  sky: { label: "Голубой", dot: "bg-sky-300", btn: "bg-sky-400/10 text-sky-200 hover:bg-sky-400/20", active: "bg-sky-400/25 text-sky-100" },
  amber: { label: "Золотой", dot: "bg-amber-300", btn: "bg-amber-400/10 text-amber-200 hover:bg-amber-400/20", active: "bg-amber-400/25 text-amber-100" },
  violet: { label: "Фиолетовый", dot: "bg-violet-300", btn: "bg-violet-400/10 text-violet-200 hover:bg-violet-400/20", active: "bg-violet-400/25 text-violet-100" },
  slate: { label: "Серый", dot: "bg-slate-300", btn: "bg-slate-400/10 text-slate-200 hover:bg-slate-400/20", active: "bg-slate-400/25 text-slate-100" },
};

export const chatColor = (c: string) => CHAT_COLORS[c] ?? CHAT_COLORS.sky;

export const CHAT_MIN_LEVEL = 2;

export const chatRequest = async <T,>(token: string | null, room: ChatRoom, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${PROFILE_URL}?resource=chat&room=${room}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify({ ...body, room }) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useChatRooms = () => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["chat-rooms", token],
    queryFn: () => chatRequest<{ rooms: ChatRoomInfo[] }>(token, "", "&rooms=1").then((d) => d.rooms),
    staleTime: 60_000,
  });
};
