import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface AiPost {
  id: number;
  title: string;
  body: string;
  links: { title: string; url: string }[];
  kind: "auto" | "manual" | "daily" | "move";
  createdAt: string;
  reactions?: Record<string, number>;
  mine?: string[];
  comments?: number;
}

export interface AiComment {
  id: number;
  text: string;
  createdAt: string;
  canDelete: boolean;
  user: { id: number; name: string; avatar: string; supporter: number | null; creator: boolean; isAi: boolean; founder: number | null; tier?: number };
}

export const REACTIONS: { kind: string; icon?: string; emoji?: string; label: string; cls: string }[] = [
  { kind: "like", icon: "ThumbsUp", label: "Нравится", cls: "bg-up/15 border-up text-up" },
  { kind: "dislike", icon: "ThumbsDown", label: "Не нравится", cls: "bg-down/15 border-down text-down" },
  { kind: "fire", emoji: "🔥", label: "Огонь", cls: "bg-amber-400/15 border-amber-400/60 text-amber-200" },
  { kind: "heart", emoji: "❤️", label: "Сердце", cls: "bg-rose-400/15 border-rose-400/60 text-rose-200" },
  { kind: "rocket", emoji: "🚀", label: "На луну", cls: "bg-sky-400/15 border-sky-400/60 text-sky-200" },
  { kind: "laugh", emoji: "😂", label: "Смешно", cls: "bg-yellow-400/15 border-yellow-400/60 text-yellow-200" },
  { kind: "wow", emoji: "😮", label: "Ого", cls: "bg-violet-400/15 border-violet-400/60 text-violet-200" },
  { kind: "sad", emoji: "😢", label: "Грустно", cls: "bg-indigo-400/15 border-indigo-400/60 text-indigo-200" },
];

export interface AiSettings {
  enabled: boolean;
  moderation: boolean;
  blockLinks: boolean;
  blockCaps: boolean;
  stopWords: string;
  reactShare: number;
  likeShare: number;
  autoNews: boolean;
  newsHours: number;
  chatReplies: boolean;
  replyAll: boolean;
  dailyPrices: boolean;
  moves: boolean;
  moveThreshold: number;
  botChatter: boolean;
  chatterPhrases: string;
}

export interface AiMailSettings {
  enabled: boolean;
  daily: boolean;
  digest: boolean;
  fromName: string;
  subjectPrefix: string;
}

export interface AiMailStats {
  sent: number;
  pending: number;
  failed: number;
  gold: number;
  goldMailOn: number;
  configured: boolean;
  log: { id: number; email: string; status: string; error: string; createdAt: string; sentAt: string | null; title: string }[];
}

export interface AiLog {
  id: number;
  room: string;
  text: string;
  reason: string;
  createdAt: string;
  user: string;
}

export const AI_NAME = "AiTraderKa";

export const aiRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${PROFILE_URL}?resource=aibot${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useAiPosts = () =>
  useQuery({
    queryKey: ["ai-posts"],
    queryFn: () => aiRequest<{ posts: AiPost[]; botId: number | null }>(null),
    staleTime: 60_000,
  });
