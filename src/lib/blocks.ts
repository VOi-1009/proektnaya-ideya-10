import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface HomeBlock {
  id: number;
  title: string;
  leftText: string;
  leftImage: string;
  rightText: string;
  rightImage: string;
  sort: number;
  published: boolean;
}

const URL_BASE = `${PROFILE_URL}?resource=blocks`;

export const blocksRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${URL_BASE}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useHomeBlocks = () =>
  useQuery({
    queryKey: ["home-blocks"],
    queryFn: () => blocksRequest<{ blocks: HomeBlock[] }>(null).then((d) => d.blocks),
    staleTime: 60_000,
  });
