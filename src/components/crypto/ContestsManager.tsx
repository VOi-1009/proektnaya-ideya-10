import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CONTEST_KIND, CONTEST_KIND_HINT, fmtDateTime, fundFmt, fundRequest, useContests } from "@/lib/fund";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Идёт", cls: "text-[#22C55E] border-[#22C55E]/40" },
  finished: { label: "Завершён", cls: "text-muted-foreground border-border" },
  cancelled: { label: "Отменён", cls: "text-[#EA3943] border-[#EA3943]/40" },
};

const EMPTY = { title: "", description: "", kind: "random", prize: "", endsAt: "" };

const ContestsManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data, refetch } = useContests(token);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const run = async (body: object, ok: string, reset = false) => {
    setBusy(true);
    try {
      await fundRequest(token, "", body);
      await refetch();
      qc.invalidateQueries({ queryKey: ["tka-fund"] });
      qc.invalidateQueries({ queryKey: ["fund-admin"] });
      qc.invalidateQueries({ queryKey: ["tka-wallet"] });
      if (reset) setForm(EMPTY);
      toast({ title: ok });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    const ends = new Date(form.endsAt);
    if (!form.endsAt || isNaN(ends.getTime())) return toast({ title: "Укажите дату окончания", variant: "destructive" });
    run(
      { action: "contest_create", title: form.title, description: form.description, kind: form.kind, prize: Number(form.prize), endsAt: ends.toISOString().replace(/\.\d{3}Z$/, "Z") },
      "Конкурс создан, приз зарезервирован в фонде",
      true,
    );
  };

  const available = data?.available ?? 0;
  const prize = Number(form.prize) || 0;
  const list = data?.contests ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Конкурсы</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Приз резервируется из фонда сразу при создании. Участники записываются сами, а в назначенное время победитель определяется автоматически и получает приз на кошелёк TKA.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Plus" size={15} className="text-primary" /> Новый конкурс</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1 block sm:col-span-2">
            <span className="text-xs text-muted-foreground">Название</span>
            <input className={inputCls} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Например: Лучший трейдер недели" />
          </label>
          <label className="space-y-1 block sm:col-span-2">
            <span className="text-xs text-muted-foreground">Описание (необязательно)</span>
            <textarea className={`${inputCls} h-20 py-2 resize-y`} maxLength={600} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Как выбираем победителя</span>
            <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {Object.entries(CONTEST_KIND).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Приз из фонда, TKA (доступно {fundFmt(available)})</span>
            <input className={inputCls} type="number" min={1} value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} />
          </label>
          <label className="space-y-1 block sm:col-span-2">
            <span className="text-xs text-muted-foreground">Окончание (по вашему времени, не раньше чем через 5 минут и не позже 90 дней)</span>
            <input className={inputCls} type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">{CONTEST_KIND_HINT[form.kind]} Если победителя нет, приз возвращается в фонд.</p>
        <Button onClick={create} disabled={busy || form.title.trim().length < 3 || prize < 1 || prize > available || !form.endsAt} className="font-semibold">
          {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
          Создать конкурс
        </Button>
        {prize > available && <p className="text-[11px] text-[#EA3943]">В фонде не хватает средств на такой приз.</p>}
      </div>

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Конкурсов пока нет.</p>}
        {list.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold text-sm">{c.title}</span>
                <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {CONTEST_KIND[c.kind]} · приз <span className="text-white font-mono">{fundFmt(c.prize)} TKA</span> · записалось {c.entries} · до {fmtDateTime(c.endsAt)}
              </div>
              {c.status === "finished" && (
                <div className="text-xs mt-0.5 text-primary">{c.winner ? `Победитель: ${c.winner} (№ ${c.winnerId})` : "Победителя нет, приз вернулся в фонд"}</div>
              )}
            </div>
            {c.status === "active" && (
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => confirm("Завершить сейчас и выбрать победителя?") && run({ action: "contest_finish", id: c.id }, "Конкурс завершён")}>
                  Завершить сейчас
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-[#EA3943]" disabled={busy} onClick={() => confirm("Отменить конкурс? Приз вернётся в фонд.") && run({ action: "contest_cancel", id: c.id }, "Конкурс отменён, приз вернулся в фонд")}>
                  Отменить
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContestsManager;
