import { useQuery } from "@tanstack/react-query";
import { fundRequest } from "@/lib/fund";

export type ShopKind = "header" | "frame" | "card" | "theme" | "badge" | "gift";

export interface ShopItem {
  id: number;
  slug: string;
  kind: ShopKind;
  name: string;
  description: string;
  emoji: string;
  imageUrl: string;
  basePrice: number;
  price: number;
  stock: number | null;
  sold: number;
  enabled: boolean;
  sort: number;
  owned?: boolean;
  equipped?: boolean;
  soldOut?: boolean;
}

export interface ShopSettings {
  enabled: boolean;
  message: string;
  giftDailyLimit: number;
  giftFeePercent: number;
  discountPercent: number;
}

export interface ShopCatalog {
  items: ShopItem[];
  kinds: Record<string, string>;
  settings: ShopSettings;
  balance: number;
  result?: { ok: boolean; spent?: number; to?: string };
}

export interface Cosmetic {
  slug: string;
  emoji: string;
  imageUrl?: string;
  name: string;
}
export type Cosmetics = Partial<Record<"header" | "frame" | "card" | "theme" | "badge", Cosmetic>>;

export const HEADER_BG: Record<string, string> = {
  h_sunset: "linear-gradient(90deg, rgba(249,115,22,0.38), rgba(236,72,153,0.22) 55%, transparent)",
  h_ocean: "linear-gradient(90deg, rgba(14,165,233,0.36), rgba(20,184,166,0.2) 55%, transparent)",
  h_neon: "linear-gradient(90deg, rgba(168,85,247,0.42), rgba(34,211,238,0.24) 55%, transparent)",
  h_fire: "linear-gradient(90deg, rgba(239,68,68,0.42), rgba(249,115,22,0.24) 55%, transparent)",
  h_aurora: "linear-gradient(90deg, rgba(34,197,94,0.36), rgba(139,92,246,0.3) 55%, transparent)",
  h_gold: "linear-gradient(90deg, rgba(250,204,21,0.45), rgba(245,158,11,0.22) 55%, transparent)",
};

export const FRAME_STYLE: Record<string, { boxShadow?: string; background?: string; ring: string }> = {
  f_emerald: { ring: "#34d399", boxShadow: "0 0 10px rgba(52,211,153,0.6)" },
  f_neon: { ring: "#22d3ee", boxShadow: "0 0 12px rgba(34,211,238,0.75)" },
  f_flame: { ring: "#f97316", boxShadow: "0 0 12px rgba(239,68,68,0.7)" },
  f_gold: { ring: "#facc15", boxShadow: "0 0 12px rgba(250,204,21,0.7)" },
  f_rainbow: { ring: "transparent", background: "conic-gradient(#f43f5e, #f59e0b, #22c55e, #06b6d4, #8b5cf6, #f43f5e)" },
};

export const CARD_BG: Record<string, string> = {
  c_night: "linear-gradient(135deg, rgba(30,58,138,0.7), rgba(15,23,42,0.4))",
  c_forest: "linear-gradient(135deg, rgba(21,128,61,0.6), rgba(5,46,22,0.35))",
  c_bull: "linear-gradient(135deg, rgba(34,197,94,0.6), rgba(34,197,94,0.08))",
  c_bear: "linear-gradient(135deg, rgba(239,68,68,0.6), rgba(239,68,68,0.08))",
  c_royal: "linear-gradient(135deg, rgba(126,34,206,0.7), rgba(250,204,21,0.35))",
};

export const THEME_STYLE: Record<string, { background: string; borderColor: string }> = {
  t_glass: { background: "linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02))", borderColor: "rgba(255,255,255,0.28)" },
  t_midnight: { background: "linear-gradient(135deg, rgba(30,41,92,0.55), rgba(15,23,42,0.35))", borderColor: "rgba(96,165,250,0.5)" },
  t_mint: { background: "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(16,185,129,0.04))", borderColor: "rgba(52,211,153,0.45)" },
  t_gold: { background: "linear-gradient(135deg, rgba(250,204,21,0.16), rgba(245,158,11,0.04))", borderColor: "rgba(250,204,21,0.5)" },
};

export const KIND_ICON: Record<string, string> = { header: "PanelTop", frame: "CircleDot", card: "IdCard", theme: "Palette", badge: "Award", gift: "Gift" };

export const shopFmt = (v: number) => v.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const useShopCatalog = (token: string | null) =>
  useQuery<ShopCatalog>({
    queryKey: ["shop-catalog", token],
    staleTime: 30_000,
    queryFn: () => fundRequest<ShopCatalog>(token, "?action=shop_catalog"),
  });

export const useAllCosmetics = () =>
  useQuery<Record<string, Cosmetics>>({
    queryKey: ["cosmetics-all"],
    staleTime: 5 * 60_000,
    queryFn: async () => (await fundRequest<{ users: Record<string, Cosmetics> }>(null, "?action=shop_cosmetics")).users,
  });

export const useUserCosmetics = (userId?: number | null): Cosmetics => {
  const { data } = useAllCosmetics();
  return userId && data ? data[String(userId)] ?? {} : {};
};
