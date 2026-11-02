import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { fmtDateTime, fundFmt } from "@/lib/fund";
import { KIND_ICON, STATUS_RU, Tournament } from "@/lib/tournaments";
import TournamentBoardView from "./TournamentBoardView";

const STATUS_CLS: Record<string, string> = {
  upcoming: "text-sky-300 border-sky-300/40",
  active: "text-[#22C55E] border-[#22C55E]/40",
  finished: "text-muted-foreground border-border",
  cancelled: "text-[#EA3943] border-[#EA3943]/40",
};

const left = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3600_000);
  if (h >= 48) return `${Math.floor(h / 24)} дн.`;
  if (h >= 1) return `${h} ч`;
  return `${Math.max(1, Math.floor(ms / 60_000))} мин`;
};

interface Props {
  t: Tournament;
  busy: boolean;
  isUser: boolean;
  onJoin: (t: Tournament) => void;
  onLeave: (t: Tournament) => void;
  defaultOpen?: boolean;
}

const TournamentCard = ({ t, busy, isUser, onJoin, onLeave, defaultOpen }: Props) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const running = t.status === "upcoming" || t.status === "active";
  const timer = t.status === "upcoming" ? `старт через ${left(t.startsAt)}` : t.status === "active" ? `осталось ${left(t.endsAt)}` : "";

  return (
    <article className={`rounded-xl border bg-card p-4 space-y-3 ${t.status === "active" ? "border-primary/40" : "border-border"}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
          <Icon name={KIND_ICON[t.kind] ?? "Trophy"} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-semibold">{t.title}</h3>
            <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${STATUS_CLS[t.status]}`}>{STATUS_RU[t.status]}</span>
            {t.joined && <span className="text-[10px] text-[#22C55E] inline-flex items-center gap-1"><Icon name="CheckCircle2" size={12} /> вы участвуете</span>}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {t.kindName} · {fmtDateTime(t.startsAt)} — {fmtDateTime(t.endsAt)}
            {timer && ` · ${timer}`}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-display text-xl text-white leading-none">{fundFmt(t.bank)}</div>
          <div className="text-[10px] text-primary font-semibold">TKA в банке</div>
        </div>
      </div>

      {t.description && <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>}
      <p className="text-[11px] text-muted-foreground/90">{t.hint}</p>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded bg-rail px-2 py-1 text-muted-foreground">Взнос: <b className="text-white font-mono">{t.entryFee > 0 ? `${fundFmt(t.entryFee)} TKA` : "бесплатно"}</b></span>
        <span className="rounded bg-rail px-2 py-1 text-muted-foreground">Участников: <b className="text-white font-mono">{t.players}{t.maxPlayers ? ` из ${t.maxPlayers}` : ""}</b></span>
        {t.kind !== "teams" && (
          <span className="rounded bg-rail px-2 py-1 text-muted-foreground">Призы: <b className="text-white font-mono">{t.split.map((p, i) => `${i + 1} место ${p}%`).join(" · ")}</b></span>
        )}
        {t.minLevel > 1 && <span className="rounded bg-rail px-2 py-1 text-muted-foreground">Нужен статус: <b className="text-white font-mono">{t.minLevel}+</b></span>}
        {t.minPlayers > 1 && t.status !== "finished" && <span className="rounded bg-rail px-2 py-1 text-muted-foreground">Минимум для старта: <b className="text-white font-mono">{t.minPlayers}</b></span>}
      </div>

      {t.mine && t.status === "finished" && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-white">
          {t.mine.place ? <>Ваше место: <b>{t.mine.place}</b>{t.mine.prize > 0 && <> · приз <b className="font-mono">{fundFmt(t.mine.prize)} TKA</b></>}</> : "Вы участвовали, призового места нет"}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {running && !t.joined && (
          <Button size="sm" className="font-semibold" disabled={busy} onClick={() => onJoin(t)}>
            {isUser ? (t.entryFee > 0 ? `Участвовать за ${fundFmt(t.entryFee)} TKA` : "Участвовать") : "Войти и участвовать"}
          </Button>
        )}
        {t.status === "upcoming" && t.joined && (
          <Button size="sm" variant="outline" className="bg-transparent" disabled={busy} onClick={() => onLeave(t)}>
            Выйти{t.entryFee > 0 ? " (взнос вернётся)" : ""}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white" onClick={() => setOpen(!open)}>
          <Icon name={open ? "ChevronUp" : "ListOrdered"} size={14} className="mr-1.5" /> {open ? "Свернуть" : t.status === "finished" ? "Итоги" : "Таблица"}
        </Button>
      </div>

      {open && <TournamentBoardView id={t.id} />}
    </article>
  );
};

export default TournamentCard;
