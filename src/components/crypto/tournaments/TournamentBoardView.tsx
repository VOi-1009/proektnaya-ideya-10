import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fundFmt } from "@/lib/fund";
import { useTournamentBoard, unitText } from "@/lib/tournaments";

const MEDAL = ["text-amber-300", "text-slate-300", "text-orange-400"];

const TournamentBoardView = ({ id }: { id: number }) => {
  const { token, user } = useAuth();
  const { data, isLoading } = useTournamentBoard(id, token);
  if (isLoading || !data) return <Skeleton className="h-32 w-full bg-rail" />;
  const t = data.tournament;
  const live = t.status === "active";

  return (
    <div className="space-y-2">
      {data.teams && (
        <div className="grid grid-cols-2 gap-2">
          {([["bull", "Быки", "#16C784"], ["bear", "Медведи", "#EA3943"]] as const).map(([k, label, color]) => (
            <div key={k} className="rounded-lg border px-3 py-2 text-center" style={{ borderColor: `${color}66`, background: `${color}14` }}>
              <div className="text-[11px] text-muted-foreground">{label}</div>
              <div className="font-mono text-sm text-white">{unitText(t, data.teams![k])}</div>
            </div>
          ))}
        </div>
      )}
      {data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">Участников пока нет. Станьте первым.</p>
      ) : (
        <div className="divide-y divide-border">
          {data.rows.map((r, i) => (
            <div key={r.userId} className={`flex items-center gap-2 py-1.5 text-sm ${user?.id === r.userId ? "bg-primary/5 -mx-2 px-2 rounded" : ""}`}>
              <span className={`w-6 text-center font-mono text-xs ${r.place && r.place <= 3 ? MEDAL[r.place - 1] : "text-muted-foreground"}`}>
                {r.place ? (r.place <= 3 ? <Icon name="Medal" size={14} className="inline" /> : r.place) : i + 1}
              </span>
              <span className="text-white truncate flex-1">
                {r.name}
                {t.kind === "teams" && r.team && <span className="ml-1.5 text-[10px] text-muted-foreground">{r.team === "bull" ? "бык" : "медведь"}</span>}
              </span>
              {t.kind !== "lottery" && t.status !== "upcoming" && (
                <span className={`font-mono text-xs ${r.score > 0 ? "text-[#16C784]" : r.score < 0 ? "text-[#EA3943]" : "text-muted-foreground"}`}>{unitText(t, r.score)}</span>
              )}
              {r.prize > 0 && <span className="font-mono text-xs text-primary">{fundFmt(r.prize)} TKA</span>}
            </div>
          ))}
        </div>
      )}
      {live && t.kind !== "lottery" && <p className="text-[10px] text-muted-foreground">Результат обновляется по ходу турнира, итог подводится после окончания.</p>}
    </div>
  );
};

export default TournamentBoardView;
