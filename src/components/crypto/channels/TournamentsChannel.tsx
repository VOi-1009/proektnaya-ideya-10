import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { fundFmt, fundRequest } from "@/lib/fund";
import { Tournament, TournamentsData, useTournaments } from "@/lib/tournaments";
import TkaIcon from "../TkaIcon";
import TournamentCard from "../tournaments/TournamentCard";

const TournamentsChannel = () => {
  const { user, token, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useTournaments(token);
  const [busy, setBusy] = useState<number | null>(null);

  const act = async (action: "tournament_join" | "tournament_leave", t: Tournament, ok: string) => {
    if (!user) return setAuthOpen(true);
    setBusy(t.id);
    try {
      const next = await fundRequest<TournamentsData>(token, "", { action, id: t.id });
      qc.setQueryData(["tournaments", token], next);
      qc.invalidateQueries({ queryKey: ["tournament", t.id] });
      qc.invalidateQueries({ queryKey: ["tka-wallet"] });
      toast({ title: ok });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !data) return <Skeleton className="h-72 w-full max-w-4xl mx-auto bg-card" />;
  const running = data.items.filter((t) => t.status === "active" || t.status === "upcoming");
  const done = data.items.filter((t) => t.status === "finished" || t.status === "cancelled");

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 flex-wrap">
        <Icon name="Swords" size={22} className="text-primary" />
        <div className="min-w-0">
          <h2 className="font-display text-lg text-white leading-tight">Турниры</h2>
          <p className="text-xs text-muted-foreground">Соревнуйтесь с другими участниками и забирайте призы в TKA. Все деньги в турнирах игровые.</p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-lg bg-rail px-3 py-2">
          <TkaIcon size={20} />
          <span className="font-mono text-white">{user ? fundFmt(data.balance) : "—"}</span>
          <span className="text-[10px] font-semibold text-primary">TKA</span>
        </div>
      </section>

      {running.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Сейчас нет открытых турниров. Следующий появится совсем скоро.
        </div>
      )}
      {running.map((t) => (
        <TournamentCard
          key={t.id}
          t={t}
          busy={busy === t.id}
          isUser={!!user}
          defaultOpen={t.status === "active"}
          onJoin={(x) => act("tournament_join", x, `Вы участвуете: ${x.title}`)}
          onLeave={(x) => act("tournament_leave", x, "Вы вышли из турнира")}
        />
      ))}

      {done.length > 0 && (
        <>
          <h3 className="text-white font-semibold text-sm flex items-center gap-1.5 pt-2">
            <Icon name="Medal" size={14} className="text-primary" /> Прошедшие турниры
          </h3>
          {done.map((t) => (
            <TournamentCard key={t.id} t={t} busy={false} isUser={!!user} onJoin={() => undefined} onLeave={() => undefined} />
          ))}
        </>
      )}
    </div>
  );
};

export default TournamentsChannel;
