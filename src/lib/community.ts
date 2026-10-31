import { PROFILE_URL } from "@/lib/auth";
import { TEAMS } from "@/lib/status";

export const REACTIONS = ["🚀", "🔥", "👍", "😂", "😮", "📉"];
export const QUICK_EMOJI = ["😀", "😎", "🤔", "🙏", "💪", "💎", "🐂", "🐻", "💰", "📈", "📉", "🚀", "🔥", "😱", "🤝", "👀"];

const bullLevel = TEAMS.bull;
const bearLevel = TEAMS.bear;

export const MOODS = {
  bull: { label: "Бычий", plural: "Бычьи", icon: bullLevel.icon, cls: bullLevel.cls, color: bullLevel.color },
  bear: { label: "Медвежий", plural: "Медвежьи", icon: bearLevel.icon, cls: bearLevel.cls, color: bearLevel.color },
};

export interface CommunityPost {
  id: number;
  body: string;
  image: string;
  sentiment: "" | "bull" | "bear";
  coins: string[];
  createdAt: string;
  user: { id: number; name: string; avatar: string; level: number; title: string; creator?: boolean; supporter?: number | null; founder?: number | null; team?: string };
  reactions: Record<string, number>;
  mine: string[];
  following: boolean;
}

export interface AuthorProfile {
  id: number;
  name: string;
  avatar: string;
  bio: string;
  city: string;
  headline: string;
  experience: string;
  interests: string;
  contacts: Record<string, string>;
  contactsHidden: boolean;
  createdAt: string;
  online: boolean;
  level: number;
  title: string;
  points: number;
  place: number;
  founder?: number | null;
  supporter?: number | null;
  creator?: boolean;
  team?: string;
  posts: number;
  bulls: number;
  bears: number;
  followers: number;
  following: number;
  reactions: number;
  isFollowing: boolean;
  isMe: boolean;
}

export interface FeedResponse {
  posts: CommunityPost[];
  canWrite: boolean;
  loggedIn: boolean;
  isAdmin: boolean;
  me: number | null;
  more: boolean;
}

export const communityRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${PROFILE_URL}?resource=community${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso + (iso.endsWith("Z") ? "" : "Z")).getTime()) / 1000);
  if (s < 60) return "только что";
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};
