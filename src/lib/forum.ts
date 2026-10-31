import { PROFILE_URL } from "@/lib/auth";

export interface ForumPerms {
  read: boolean;
  topic: boolean;
  reply: boolean;
}

export interface ForumSectionItem {
  id: number;
  parentId: number | null;
  title: string;
  description: string;
  topics: number;
  posts: number;
  lastPostAt: string | null;
  can: ForumPerms;
  need: { plan: number; level: number; guests: boolean };
}

export interface ForumUser {
  id: number;
  name: string;
  avatar: string;
  supporter: number | null;
  creator: boolean;
  isAi: boolean;
  tier: number;
}

export interface ForumTopicItem {
  id: number;
  title: string;
  pinned: boolean;
  closed: boolean;
  posts: number;
  createdAt: string;
  lastPostAt: string;
  user: ForumUser;
}

export interface ForumPost {
  id: number;
  text: string;
  createdAt: string;
  canDelete: boolean;
  user: ForumUser;
}

export const forumRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${PROFILE_URL}?resource=forum${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error ?? "Не удалось связаться с сервером"), { locked: !!data.locked });
  return data as T;
};

export const LEVEL_NAMES = ["", "Новичок", "Студент", "Наблюдатель", "Скальпер", "Свингер", "Стратег", "Рыночный волк", "Трейдер", "Аналитик", "Кит", "Медведь", "Бык", "Модератор", "Администрация"];
