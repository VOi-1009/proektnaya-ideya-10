import { COIN_META } from "@/lib/crypto";
import { tka } from "@/lib/tka";
import func2url from "../../../../backend/func2url.json";

export const URL = func2url.trading;

export interface Position { id: number; coinId: string; side: "long" | "short"; leverage: number; margin: number; size: number; entry: number; price: number; pnl: number; liq: number; sl: number | null; tp: number | null }
export interface Order { id: number; coinId: string; side: "long" | "short"; leverage: number; margin: number; limit: number; sl: number | null; tp: number | null }
export interface Trade { id: number; coinId: string; side: "long" | "short"; leverage: number; margin: number; entry: number; close: number; pnl: number; reason: string; closedAt: string }
export interface Stats { trades: number; winRate: number; avgPnl: number; avgPct: number; best: number; bestPct: number; worst: number; worstPct: number; totalPnl: number; curve: { t: string; v: number }[] }
export interface State { stats?: Stats; balance: number; equity: number; locked: number; unrealized: number; resets: number; start: number; positions: Position[]; orders: Order[]; history: Trade[]; prices: Record<string, number> }
export interface Leader { pnl?: number; userId: number; name: string; avatar: string; equity: number; profitPct: number; trades: number }
export interface PubTrade { id: number; coinId: string; side: "long" | "short"; leverage: number; entry: number; price: number; pct: number; open: boolean; at: string }

export type Tab = "positions" | "orders" | "history" | "leaders";
export type Send = (body: Record<string, unknown>, ok: string) => Promise<void>;

export const usd = tka;
export const pct = (pnl: number, base: number) => `${pnl > 0 ? "+" : ""}${base ? ((pnl / base) * 100).toFixed(1) : "0.0"}%`;
export const tone = (v: number) => (v >= 0 ? "text-[#16C784]" : "text-[#EA3943]");
export const name = (id: string) => COIN_META[id]?.ru ?? id;
export const reasonText: Record<string, string> = { stop: "Стоп-лосс", take: "Тейк-профит", manual: "Закрыта вручную", liquidation: "Ликвидация", reset: "Сброс счёта" };

export const List = ({ children, empty }: { children: React.ReactNode; empty: string }) => {
  const items = Array.isArray(children) ? children : children ? [children] : [];
  return items.length ? <div className="divide-y divide-border">{children}</div> : <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>;
};

export const Row = ({ children }: { children: React.ReactNode }) => <div className="flex items-center gap-3 py-2.5">{children}</div>;
