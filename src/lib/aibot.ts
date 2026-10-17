import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface AiPost {
  id: number;
  title: string;
  body: string;
  links: { title: string; url: string }[];
  kind: "auto" | "manual";
  createdAt: string;
}

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
