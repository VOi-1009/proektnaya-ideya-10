import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { fmtDateTime, fundFmt, fundRequest, useContests } from "@/lib/fund";
import { KIND_ICON, STATUS_RU, Tournament } from "@/lib/tournaments";
import TournamentBoardView from "./tournaments/TournamentBoardView";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

type Item = Tournament & { paid: number; prizesPaid: number };
interface Data {
  items: Item[];
  kinds: Record<string, { name: string; hint: string }>;
  badges: { id: number; name: string }[];
}

const STATUS_CLS: Record<string, string> = {
  upcoming: "text-sky-300 border-sky-300/40",
  active: "text-[#22C55E] border-[#22C55E]/40",
  finished: "text-muted-foreground border-border",
  cancelled: "text-[#EA3943] border-[#EA3943]/40",
};

const localInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toServer = (v: string) => (v ? new Date(v).toISOString().slice(0, 19) : "");

const emptyForm = () => {
  const s = new Date(Date.now() + 3600_000);
  const e = new Date(s.getTime() + 7 * 86400_000);
  return {
    kind: "trader", title: "", description: "", startsAt: localInput(s), endsAt: localInput(e), entryFee: "0", prizePool: "0",
    prizeSplit: "60,30,10", feePercent: "10", minPlayers: "2", maxPlayers: "0", minLevel: "1", badgeItemId: "0",
  };
};

const PRESETS = [
  { label: "Победитель получает всё", v: "100" },
  { label: "Топ-2: 70 / 30", v: "70,30" },
  { label: "Топ-3: 60 / 30 / 10", v: "60,30,10" },
  { label: "Топ-5: 40 / 25 / 15 / 12 / 8", v: "40,25,15,12,8" },
];

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="space-y-1 block">
    <span className="text-xs text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="text-[10px] text-muted-foreground/80 block leading-snug">{hint}</span>}
  </label>
);

const TournamentsManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["tournament-admin", token], enabled: !!token, queryFn: () => fundRequest<Data>(token, "?action=tournament_admin"), refetchInterval: 60_000 });
  const { data: contests } = useContests(token);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (body: object, ok: string, after?: () => void) => {
    setBusy(true);
    try {
      const next = await fundRequest<Data>(token, "", body);
      qc.setQueryData(["tournament-admin", token], next);
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      qc.invalidateQueries({ queryKey: ["tka-fund"] });
      qc.invalidateQueries({ queryKey: ["contests"] });
      after?.();
      toast({ title: ok });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const set = (k: keyof ReturnType<typeof emptyForm>, v: string) => setForm({ ...form, [k]: v });
  const available = contests?.available ?? 0;
  const pool = Number(form.prizePool) || 0;
  const kind = data.kinds[form.kind];

  const payload = () => ({
    ...form, entryFee: Number(form.entryFee), prizePool: Number(form.prizePool), feePercent: Number(form.feePercent),
    minPlayers: Number(form.minPlayers), maxPlayers: Number(form.maxPlayers), minLevel: Number(form.minLevel),
    badgeItemId: Number(form.badgeItemId), startsAt: toServer(form.startsAt), endsAt: toServer(form.endsAt),
  });

  const startEdit = (t: Item) => {
    setEditing(t.id);
    setForm({
      kind: t.kind, title: t.title, description: t.description, startsAt: localInput(new Date(t.startsAt)), endsAt: localInput(new Date(t.endsAt)),
      entryFee: String(t.entryFee), prizePool: String(t.prizePool), prizeSplit: t.prizeSplit, feePercent: String(t.feePercent),
      minPlayers: String(t.minPlayers), maxPlayers: String(t.maxPlayers), minLevel: String(t.minLevel), badgeItemId: String(t.badgeItemId ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = () =>
    run(editing ? { action: "tournament_update", id: editing, ...payload() } : { action: "tournament_create", ...payload() },
      editing ? "Турнир обновлён" : "Турнир создан", () => { setForm(emptyForm()); setEditing(null); });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white flex items-center gap-2"><Icon name="Swords" size={22} className="text-primary" /> Турниры</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Соревнования с призами в TKA. Призовой фонд берётся из общего фонда (сейчас доступно <b className="text-white font-mono">{fundFmt(available)} TKA</b>), взносы участников идут в банк.
          Итоги подводятся сами, когда турнир заканчивается.
        </p>
      </div>

      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">{editing ? "Редактирование турнира" : "Новый турнир"}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Вид турнира" hint={kind?.hint}>
            <select className={inputCls} disabled={!!editing} value={form.kind} onChange={(e) => set("kind", e.target.value)}>
              {Object.entries(data.kinds).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Название">
            <input className={inputCls} maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Например, Неделя трейдеров" />
          </Field>
        </div>
        <textarea className={`${inputCls} h-20 py-2 resize-none`} maxLength={600} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Описание для участников (необязательно)" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Начало"><input className={inputCls} type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field>
          <Field label="Окончание"><input className={inputCls} type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <Field label="Взнос участника, TKA" hint="0 — бесплатно"><input className={inputCls} type="number" min={0} value={form.entryFee} onChange={(e) => set("entryFee", e.target.value)} /></Field>
          <Field label="Призовой фонд из фонда, TKA" hint={pool > available ? "В фонде не хватает" : "Резервируется при создании"}>
            <input className={inputCls} type="number" min={0} disabled={!!editing} value={form.prizePool} onChange={(e) => set("prizePool", e.target.value)} />
          </Field>
          <Field label="Комиссия с взносов, %" hint="Уходит обратно в общий фонд"><input className={inputCls} type="number" min={0} max={50} value={form.feePercent} onChange={(e) => set("feePercent", e.target.value)} /></Field>
          <Field label="Нужный статус участника" hint="1 — любой"><input className={inputCls} type="number" min={1} max={20} value={form.minLevel} onChange={(e) => set("minLevel", e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Минимум участников" hint="Если меньше, турнир отменится и деньги вернутся"><input className={inputCls} type="number" min={1} value={form.minPlayers} onChange={(e) => set("minPlayers", e.target.value)} /></Field>
          <Field label="Максимум участников" hint="0 — без ограничения"><input className={inputCls} type="number" min={0} value={form.maxPlayers} onChange={(e) => set("maxPlayers", e.target.value)} /></Field>
          <Field label="Значок победителю" hint="Из магазина, выдаётся 1 месту">
            <select className={inputCls} value={form.badgeItemId} onChange={(e) => set("badgeItemId", e.target.value)}>
              <option value="0">Без значка</option>
              {data.badges.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
        </div>
        {form.kind !== "teams" && (
          <Field label="Как делить банк по местам, % (сумма должна быть 100)">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {PRESETS.map((p) => (
                <button key={p.v} type="button" onClick={() => set("prizeSplit", p.v)} className={`text-[11px] px-2 py-1 rounded-full border ${form.prizeSplit === p.v ? "border-primary bg-primary/15 text-white" : "border-border text-muted-foreground"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <input className={inputCls} value={form.prizeSplit} onChange={(e) => set("prizeSplit", e.target.value)} placeholder="60,30,10" />
          </Field>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={save} disabled={busy || form.title.trim().length < 3 || (!editing && pool > available)} className="font-semibold">
            {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
            {editing ? "Сохранить изменения" : "Создать турнир"}
          </Button>
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setForm(emptyForm()); }}>Отмена</Button>}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold text-sm">Все турниры</h2>
        {data.items.length === 0 && <p className="text-sm text-muted-foreground">Турниров пока нет. Создайте первый выше.</p>}
        {data.items.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Icon name={KIND_ICON[t.kind] ?? "Trophy"} size={16} className="text-primary" />
              <span className="text-white font-semibold text-sm">{t.title}</span>
              <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${STATUS_CLS[t.status]}`}>{STATUS_RU[t.status]}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{t.kindName}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {fmtDateTime(t.startsAt)} — {fmtDateTime(t.endsAt)} · участников {t.players}{t.maxPlayers ? ` из ${t.maxPlayers}` : ""} · взнос {t.entryFee > 0 ? `${fundFmt(t.entryFee)} TKA` : "нет"} · банк{" "}
              <span className="text-white font-mono">{fundFmt(t.bank)} TKA</span>
              {t.status === "finished" && <> · выплачено <span className="text-white font-mono">{fundFmt(t.prizesPaid)} TKA</span></>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="bg-transparent h-8" onClick={() => setOpen(open === t.id ? null : t.id)}>
                <Icon name="ListOrdered" size={13} className="mr-1" /> Участники
              </Button>
              {t.status === "upcoming" && (
                <Button size="sm" variant="outline" className="bg-transparent h-8" onClick={() => startEdit(t)}>
                  <Icon name="Pencil" size={13} className="mr-1" /> Изменить
                </Button>
              )}
              {(t.status === "active" || t.status === "upcoming") && (
                <>
                  <Button size="sm" variant="secondary" className="h-8" disabled={busy} onClick={() => window.confirm("Завершить турнир сейчас и выдать призы по текущим результатам?") && run({ action: "tournament_finish", id: t.id }, "Турнир завершён")}>
                    Завершить сейчас
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-[#EA3943]" disabled={busy} onClick={() => window.confirm("Отменить турнир? Взносы вернутся, призовой фонд вернётся в общий фонд.") && run({ action: "tournament_cancel", id: t.id }, "Турнир отменён")}>
                    Отменить
                  </Button>
                </>
              )}
              {(t.status === "finished" || t.status === "cancelled") && (
                <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-[#EA3943]" disabled={busy} onClick={() => window.confirm("Удалить турнир из списка?") && run({ action: "tournament_delete", id: t.id }, "Турнир удалён")}>
                  <Icon name="Trash2" size={13} className="mr-1" /> Удалить
                </Button>
              )}
            </div>
            {open === t.id && <TournamentBoardView id={t.id} />}
          </div>
        ))}
      </section>
    </div>
  );
};

export default TournamentsManager;
