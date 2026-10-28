import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface BookQuote {
  id: number;
  quote: string;
  book: string;
  author: string;
  published: boolean;
  createdAt: string;
}

const URL_BASE = `${PROFILE_URL}?resource=quotes`;

export const quotesRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${URL_BASE}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useQuotes = () =>
  useQuery({
    queryKey: ["book-quotes"],
    queryFn: () => quotesRequest<{ items: BookQuote[] }>(null).then((d) => d.items),
    staleTime: 5 * 60_000,
  });
