import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";
import { CHANNELS } from "@/components/crypto/home/homeConfig";

export interface MenuItemCfg {
  id: string;
  label: string;
  hidden: boolean;
}

export interface MenuSettings {
  items: MenuItemCfg[];
  menuTitle: string;
  radarsTitle: string;
  radarsFirst: boolean;
}

export const EXTRA_ITEMS = [
  { id: "rating", name: "рейтинг" },
  { id: "community", name: "сообщество" },
  { id: "donate", name: "поддержать проект" },
];

export const BASE_ITEMS: { id: string; name: string }[] = [
  ...CHANNELS.map((c) => ({ id: c.id, name: c.name.replace(/-/g, " ") })),
  ...EXTRA_ITEMS,
];

export const DEFAULT_MENU_TITLE = "Меню";
export const DEFAULT_RADARS_TITLE = "Радары";

export const mergeMenu = (saved?: MenuSettings | null): MenuItemCfg[] => {
  const known = new Set(BASE_ITEMS.map((i) => i.id));
  const out: MenuItemCfg[] = [];
  const seen = new Set<string>();
  (saved?.items ?? []).forEach((i) => {
    if (known.has(i.id) && !seen.has(i.id)) {
      seen.add(i.id);
      out.push({ id: i.id, label: i.label ?? "", hidden: !!i.hidden });
    }
  });
  BASE_ITEMS.forEach((i) => {
    if (!seen.has(i.id)) out.push({ id: i.id, label: "", hidden: false });
  });
  return out;
};

export const menuRequest = async <T,>(token: string | null, body?: object): Promise<T> => {
  const r = await fetch(`${PROFILE_URL}?resource=menu`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useMenuSettings = () =>
  useQuery({
    queryKey: ["menu-settings"],
    queryFn: () => menuRequest<{ menu: MenuSettings }>(null).then((d) => d.menu),
    staleTime: 5 * 60_000,
  });
