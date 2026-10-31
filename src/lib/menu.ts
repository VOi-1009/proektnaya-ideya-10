import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";
import { CHANNELS } from "@/components/crypto/home/homeConfig";
import type { Radar } from "@/lib/radars";
import type { ChatRoomInfo } from "@/lib/chat";

export interface MenuItemCfg {
  id: string;
  label: string;
  hidden: boolean;
  icon: string;
  color: string;
}

export interface MenuSettings {
  items: MenuItemCfg[];
  menuTitle: string;
  v?: number;
  radarsFirst?: boolean;
}

export type MenuKind = "base" | "tool" | "radar" | "chat";

export interface MenuEntry extends MenuItemCfg {
  kind: MenuKind;
  name: string;
  defColor: string;
  defIcon: string;
  locked: boolean;
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

export const TOOL_IDS = ["market", "portfolio", "alerts", "converter"];

export const DEFAULT_MENU_TITLE = "Меню";

export const PRIMARY_COLOR = "hsl(var(--primary))";

const BASE_COLORS: Record<string, string> = {
  ainews: "#FFFFFF",
  portfolio: "#A78BFA",
  donate: "#22C55E",
  trading: "#22C55E",
  community: "hsl(var(--down))",
};

const BASE_ICONS: Record<string, string> = {
  community: "MessagesSquare",
};

const CHAT_HEX: Record<string, string> = {
  emerald: "#6EE7B7",
  rose: "#FDA4AF",
  sky: "#7DD3FC",
  amber: "#FCD34D",
  violet: "#C4B5FD",
  slate: "#CBD5E1",
};

const blank = { label: "", hidden: false, icon: "", color: "" };

const defaultEntries = (radars?: Radar[], chats?: ChatRoomInfo[]): MenuEntry[] => {
  const base = BASE_ITEMS.filter((b) => b.id !== "alerts").map<MenuEntry>((b) => ({
    ...blank,
    id: b.id,
    kind: TOOL_IDS.includes(b.id) ? "tool" : "base",
    name: b.name,
    defColor: BASE_COLORS[b.id] ?? PRIMARY_COLOR,
    defIcon: BASE_ICONS[b.id] ?? "",
    locked: false,
  }));
  const chatEntries = (chats ?? []).map<MenuEntry>((r) => ({
    ...blank,
    id: `chat-${r.id}`,
    kind: "chat",
    name: r.name,
    defColor: CHAT_HEX[r.color] ?? CHAT_HEX.sky,
    defIcon: "",
    locked: r.access === "list",
  }));
  const radarEntries = (radars ?? []).map<MenuEntry>((r) => ({
    ...blank,
    id: `radar-${r.id}`,
    kind: "radar",
    name: r.title.replace(/-/g, " "),
    defColor: r.color || PRIMARY_COLOR,
    defIcon: "",
    locked: false,
  }));
  return [
    ...base.filter((e) => e.kind === "base"),
    ...chatEntries,
    ...base.filter((e) => e.kind === "tool"),
    ...radarEntries,
  ];
};

export const mergeMenu = (saved?: MenuSettings | null, radars?: Radar[], chats?: ChatRoomInfo[]): MenuEntry[] => {
  const defaults = defaultEntries(radars, chats);
  const byId = new Map(defaults.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const out: MenuEntry[] = [];
  (saved?.items ?? []).forEach((i) => {
    const d = byId.get(i.id);
    if (d && !seen.has(i.id)) {
      seen.add(i.id);
      out.push({ ...d, label: i.label ?? "", hidden: !!i.hidden, icon: i.icon ?? "", color: i.color ?? "" });
    }
  });
  defaults.forEach((d) => {
    if (!seen.has(d.id)) out.push(d);
  });
  if ((saved?.v ?? 0) >= 2) return out;

  const group = (e: MenuEntry) => (e.kind === "chat" ? 1 : e.kind === "radar" ? 3 : e.kind === "tool" ? 2 : 0);
  const rank = saved?.radarsFirst ? [2, 3, 0, 1] : [0, 1, 2, 3];
  return [...out].sort((a, b) => rank.indexOf(group(a)) - rank.indexOf(group(b)));
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
