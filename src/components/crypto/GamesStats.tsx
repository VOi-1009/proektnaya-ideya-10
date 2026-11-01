import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { fundFmt, fundRequest } from "@/lib/fund";

interface Stats {
  played: number;
  wins: number;
  winRate: number;
  bets: number;
  payouts: number;
  net: number;
  best: number;
  favorite: string;
}

interface Props {
  token: string | null;
  userId?: number;
  compact?: boolean;
}

const Cell = ({ label, value, cls = "text-white" }: { label: string; value: string; cls?: string }) => (
  <div className="rounded-lg bg-rail/60 px-3 py-2 min-w-0">
    <div className="text-[10px] text-muted-foreground">{label}</div>
    <div className={`font-mono text-sm truncate ${cls}`}>{value}</div>
  </div>
);

const GamesStats = ({ token, userId, compact }: Props) => {
  const { data, isLoading } = useQuery<{ stats: Stats }>({
    queryKey: ["games-stats", userId ?? "me", token],
    enabled: !!token,
    staleTime: 30_000,
    queryFn: () => fundRequest<{ stats: Stats }>(token, `?action=games_stats${userId ? `&userId=${userId}` : ""}`),
  });
  const s = data?.stats;
  if (compact && !isLoading && (!s || s.played === 0)) return null;
  const net = s?.net ?? 0;
  const sign = net > 0 ? "+" : net < 0 ? "−" : "";
  const tone = net > 0 ? "text-[#22C55E]" : net < 0 ? "text-[#EA3943]" : "text-white";

  return (
    <section className={compact ? "" : "bg-card border border-border rounded-xl p-4 sm:p-5"}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-semibold text-sm flex items-center gap-1.5">
          <Icon name="Gamepad2" size={15} className="text-primary" /> Мини-игры
        </span>
        {s && s.favorite && <span className="text-[11px] text-muted-foreground">любимая: {s.favorite}</span>}
      </div>
      {isLoading || !s ? (
        <Skeleton className="h-16 w-full bg-rail" />
      ) : s.played === 0 ? (
        <p className="text-xs text-muted-foreground">Пока ни одной игры. Загляните в раздел «мини-игры».</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Cell label="Сыграно игр" value={String(s.played)} />
          <Cell label="Выиграно" value={`${s.wins} · ${String(s.winRate).replace(".", ",")}%`} />
          <Cell label="Общий итог, TKA" value={`${sign}${fundFmt(Math.abs(net))}`} cls={tone} />
          <Cell label="Лучший выигрыш" value={s.best > 0 ? `+${fundFmt(s.best)}` : "—"} cls={s.best > 0 ? "text-[#22C55E]" : "text-white"} />
        </div>
      )}
    </section>
  );
};

export default GamesStats;
