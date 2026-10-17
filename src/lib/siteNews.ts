import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface SiteNews {
  id: number;
  title: string;
  body: string;
  published: boolean;
  createdAt: string;
}

const URL_BASE = `${PROFILE_URL}?resource=sitenews`;

export const siteNewsRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${URL_BASE}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useSiteNews = () =>
  useQuery({
    queryKey: ["site-news"],
    queryFn: () => siteNewsRequest<{ items: SiteNews[] }>(null).then((d) => d.items),
    staleTime: 5 * 60_000,
  });
