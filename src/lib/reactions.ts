import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface Reaction {
  likes: number;
  dislikes: number;
  mine: number;
}

export type ReactionMap = Record<string, Reaction>;

const URL_BASE = `${PROFILE_URL}?resource=reactions`;
const hdrs = (token: string | null) => ({ "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) });

export interface ReactionItem {
  id: string;
  title: string;
  link: string;
  source: string;
  ts: number;
  kind: string;
}

export const useReactions = (items: ReactionItem[], token: string | null) => {
  const ids = items.map((i) => i.id);
  const key = ["reactions", token, ids.join(",")];
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: key,
    enabled: ids.length > 0,
    queryFn: async () => {
      const r = await fetch(URL_BASE, {
        method: "POST",
        headers: hdrs(token),
        body: JSON.stringify({ action: "summary", items }),
      });
      const d = await r.json().catch(() => ({}));
      return (d.reactions ?? {}) as ReactionMap;
    },
    staleTime: 30_000,
    refetchInterval: 3 * 60_000,
  });

  const react = async (newsId: string, value: 1 | -1, meta?: { title: string; link: string; source: string; kind: string }) => {
    const prev = q.data?.[newsId] ?? { likes: 0, dislikes: 0, mine: 0 };
    const next = prev.mine === value ? 0 : value;
    const optimistic: Reaction = {
      likes: prev.likes - (prev.mine === 1 ? 1 : 0) + (next === 1 ? 1 : 0),
      dislikes: prev.dislikes - (prev.mine === -1 ? 1 : 0) + (next === -1 ? 1 : 0),
      mine: next,
    };
    qc.setQueryData<ReactionMap>(key, (old) => ({ ...(old ?? {}), [newsId]: optimistic }));
    const r = await fetch(URL_BASE, { method: "POST", headers: hdrs(token), body: JSON.stringify({ newsId, value: next, ...(meta ?? {}) }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      qc.setQueryData<ReactionMap>(key, (old) => ({ ...(old ?? {}), [newsId]: prev }));
      throw new Error(d.error ?? "Не удалось сохранить оценку");
    }
    qc.setQueryData<ReactionMap>(key, (old) => ({ ...(old ?? {}), [newsId]: { likes: d.likes, dislikes: d.dislikes, mine: d.mine } }));
    qc.invalidateQueries({ queryKey: ["top-news"] });
  };

  return { reactions: q.data ?? {}, react };
};

export interface TopNews {
  id: string;
  title: string;
  link: string;
  source: string;
  kind: string;
  likes: number;
  dislikes: number;
  total: number;
  ts: number | null;
}

export const useTopNews = () =>
  useQuery({
    queryKey: ["top-news"],
    queryFn: async () => {
      const r = await fetch(`${URL_BASE}&top=1`);
      const d = await r.json().catch(() => ({}));
      return (d.top ?? []) as TopNews[];
    },
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });
