import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface Poll {
  id: number;
  question: string;
  total: number;
  mine: number | null;
  options: PollOption[];
}

export interface AdminPollOption extends PollOption {
  seed: number;
  real: number;
}

export interface AdminPoll {
  id: number;
  question: string;
  active: boolean;
  botsVote: boolean;
  createdAt: string;
  total: number;
  mine: number | null;
  options: AdminPollOption[];
}

const URL_BASE = `${PROFILE_URL}?resource=polls`;

export const pollsRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${URL_BASE}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const usePolls = (token: string | null) =>
  useQuery({
    queryKey: ["polls", token],
    queryFn: () => pollsRequest<{ polls: Poll[] }>(token).then((d) => d.polls),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

export const pct = (v: number, total: number) => (total ? Math.round((v / total) * 100) : 0);
