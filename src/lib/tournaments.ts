import { useQuery } from "@tanstack/react-query";
import { fundRequest } from "@/lib/fund";

export interface Tournament {
  id: number;
  title: string;
  description: string;
  kind: "trader" | "games" | "activity" | "teams" | "lottery";
  kindName: string;
  unit: string;
  hint: string;
  entryFee: number;
  prizePool: number;
  prizeSplit: string;
  split: number[];
  feePercent: number;
  minPlayers: number;
  maxPlayers: number;
  minLevel: number;
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "active" | "finished" | "cancelled";
  badgeItemId: number | null;
  players: number;
  bank: number;
  joined: boolean;
  mine: { place: number | null; prize: number; score: number | null } | null;
}

export interface TournamentsData {
  items: Tournament[];
  kinds: Record<string, string>;
  balance: number;
}

export interface TournamentRow {
  userId: number;
  name: string;
  avatar: string;
  team: string;
  place: number | null;
  score: number;
  prize: number;
}

export interface TournamentBoard {
  tournament: Tournament;
  rows: TournamentRow[];
  teams: { bull: number; bear: number } | null;
}

export const STATUS_RU: Record<string, string> = { upcoming: "Скоро старт", active: "Идёт", finished: "Завершён", cancelled: "Отменён" };
export const KIND_ICON: Record<string, string> = { trader: "CandlestickChart", games: "Gamepad2", activity: "Flame", teams: "Swords", lottery: "Ticket" };

export const useTournaments = (token: string | null) =>
  useQuery<TournamentsData>({
    queryKey: ["tournaments", token],
    staleTime: 20_000,
    refetchInterval: 60_000,
    queryFn: () => fundRequest(token, "?action=tournaments"),
  });

export const useTournamentBoard = (id: number | null, token: string | null) =>
  useQuery<TournamentBoard>({
    queryKey: ["tournament", id, token],
    enabled: id !== null,
    staleTime: 20_000,
    queryFn: () => fundRequest(token, `?action=tournament&id=${id}`),
  });

export const unitText = (t: { unit: string }, v: number) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}${t.unit ? ` ${t.unit}` : ""}`;
