import { PROFILE_URL } from "@/lib/auth";

export type ChatRoom = "green" | "red" | "premium";

export interface ChatMessage {
  id: number;
  text: string;
  createdAt: string;
  mine: boolean;
  user: { id: number; name: string; avatar: string; level: number; supporter?: number | null; creator?: boolean; isBot?: boolean; isAi?: boolean };
}

export const CHAT_ROOMS: { id: ChatRoom; name: string; topic: string; dot: string; btn: string; active: string }[] = [
  {
    id: "green",
    name: "Чат зеленых",
    topic: "Общение для тех, кто ждёт роста рынка",
    dot: "bg-emerald-300",
    btn: "bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20",
    active: "bg-emerald-400/25 text-emerald-100",
  },
  {
    id: "red",
    name: "Чат красных",
    topic: "Общение для тех, кто ждёт падения рынка",
    dot: "bg-rose-300",
    btn: "bg-rose-400/10 text-rose-200 hover:bg-rose-400/20",
    active: "bg-rose-400/25 text-rose-100",
  },
  {
    id: "premium",
    name: "Премиум",
    topic: "Закрытый чат для премиум-участников",
    dot: "bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 shadow-[0_0_6px_rgba(251,191,36,0.7)]",
    btn: "text-amber-200 hover:bg-amber-400/10",
    active: "bg-amber-400/15 text-amber-100",
  },
];

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
