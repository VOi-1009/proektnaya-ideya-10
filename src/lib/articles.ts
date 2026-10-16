import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface Article {
  id: number;
  title: string;
  summary: string;
  content?: string;
  cover: string;
  published: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
}

const URL_BASE = `${PROFILE_URL}?resource=articles`;

export const articlesRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${URL_BASE}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useArticles = () =>
  useQuery({
    queryKey: ["articles"],
    queryFn: () => articlesRequest<{ articles: Article[] }>(null).then((d) => d.articles),
    staleTime: 60_000,
  });

export const useArticle = (id: number | null) =>
  useQuery({
    queryKey: ["article", id],
    queryFn: () => articlesRequest<{ article: Article }>(null, `&id=${id}`).then((d) => d.article),
    enabled: id !== null,
  });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
