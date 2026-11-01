import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { CONTEST_KIND, CONTEST_KIND_HINT, fmtDateTime, fundFmt, fundRequest, useContests } from "@/lib/fund";

const left = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "завершается";
  const h = Math.floor(ms / 3600_000);
  if (h >= 48) return `${Math.floor(h / 24)} дн.`;
  if (h >= 1) return `${h} ч`;
  return `${Math.max(1, Math.floor(ms / 60_000))} мин`;
};

const ContestsList = () => {
  const { user, token, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const { data } = useContests(token);
  const [busy, setBusy] = useState<number | null>(null);

  const join = async (id: number) => {
    if (!user) return setAuthOpen(true);
    setBusy(id);
    try {
      await fundRequest(token, "", { action: "contest_join", id });
      await qc.invalidateQueries({ queryKey: ["contests"] });
      toast({ title: "Вы записались на конкурс" });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const active = (data?.contests ?? []).filter((c) => c.status === "active");
  const done = (data?.contests ?? []).filter((c) => c.status === "finished").slice(0, 3);
  if (!active.length && !done.length) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
        <Icon name="Trophy" size={14} className="text-primary" /> Конкурсы с призами из фонда
      </h3>
      {active.map((c) => (
        <div key={c.id} className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-white font-semibold text-sm">{c.title}</div>
            {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
            <div className="text-[11px] text-muted-foreground mt-1">
              {CONTEST_KIND[c.kind]} · до {fmtDateTime(c.endsAt)} (осталось {left(c.endsAt)}) · записалось {c.entries}
            </div>
            <div className="text-[10px] text-muted-foreground/80">{CONTEST_KIND_HINT[c.kind]}</div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
            <div className="font-display text-xl text-white leading-none">
              {fundFmt(c.prize)} <span className="text-xs text-primary font-semibold">TKA</span>
            </div>
            {c.joined ? (
              <span className="text-xs text-[#22C55E] inline-flex items-center gap-1"><Icon name="CheckCircle2" size={14} /> Вы участвуете</span>
            ) : (
              <Button size="sm" className="font-semibold" disabled={busy === c.id} onClick={() => join(c.id)}>
                {user ? "Участвовать" : "Войти и участвовать"}
              </Button>
            )}
          </div>
        </div>
      ))}
      {done.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground">Недавние итоги</div>
          {done.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <Icon name="Medal" size={14} className="text-primary flex-shrink-0" />
              <span className="text-white truncate">{c.title}</span>
              <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                {c.winner ? `${c.winner} · ${fundFmt(c.prize)} TKA` : "без победителя"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ContestsList;
