import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Fund, FundOp, FundSettings, fundFmt, fundRequest } from "@/lib/fund";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

interface AdminData {
  state: Fund;
  settings: FundSettings;
  ops: (FundOp & { id: number; user: string })[];
}

const KIND: Record<string, string> = { fee: "Комиссия", deposit: "Пополнение", adjust: "Списание", payout: "Выплата" };

const FundManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["fund-admin", token],
    queryFn: () => fundRequest<AdminData>(token, "?action=fund_admin"),
    enabled: !!token,
  });
  const [form, setForm] = useState<FundSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [adj, setAdj] = useState({ amount: "", note: "" });
  const [pay, setPay] = useState({ userId: "", amount: "", note: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !form) setForm(data.settings);
  }, [data, form]);

  const done = async () => {
    await refetch();
    qc.invalidateQueries({ queryKey: ["tka-fund"] });
    qc.invalidateQueries({ queryKey: ["tka-wallet"] });
  };

  const run = async (body: object, ok: string, after?: () => void) => {
    setBusy(true);
    try {
      await fundRequest(token, "", body);
      await done();
      after?.();
      toast({ title: ok });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await fundRequest(token, "", { action: "fund_settings", ...form });
      await done();
      toast({ title: "Настройки фонда сохранены" });
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!data || !form) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const st = data.state;
  const pct = st.goal > 0 ? Math.min(100, (st.total / st.goal) * 100) : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Фонд</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Сюда попадает комиссия с обменов TKA и виртуальных USDT. Можно менять процент, ставить цель, пополнять фонд и выплачивать участникам.
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-2">
        {[
          ["В фонде", `${fundFmt(st.total)} TKA`],
          ["Обменов с комиссией", String(st.count)],
          ["Участников внесли", String(st.donors)],
          ["Комиссия сейчас", `${(st.rate * 100).toFixed(2).replace(".", ",")}%`],
        ].map(([l, v]) => (
          <div key={l} className="bg-card border border-border rounded-lg px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{l}</div>
            <div className="font-mono text-white text-sm">{v}</div>
          </div>
        ))}
      </div>
      {st.goal > 0 && (
        <div className="bg-card border border-border rounded-lg px-3 py-2 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Цель фонда</span>
            <span className="font-mono text-white">{fundFmt(st.total)} / {fundFmt(st.goal)} TKA</span>
          </div>
          <div className="h-2 rounded-full bg-rail overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Settings" size={15} className="text-primary" /> Настройки</h2>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Название</span>
            <input className={inputCls} value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Описание для участников</span>
            <textarea className={`${inputCls} h-24 py-2 resize-y`} value={form.description} maxLength={600} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Комиссия обмена, % (0 – 5)</span>
              <input className={inputCls} type="number" step="0.01" min={0} max={5} value={form.feePercent} onChange={(e) => setForm({ ...form, feePercent: Number(e.target.value) })} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Цель, TKA (0 — без цели)</span>
              <input className={inputCls} type="number" min={0} value={form.goal} onChange={(e) => setForm({ ...form, goal: Number(e.target.value) })} />
            </label>
          </div>
          <Button onClick={saveSettings} disabled={saving} className="font-semibold">
            {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
            Сохранить
          </Button>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="PlusCircle" size={15} className="text-primary" /> Пополнить или списать</h2>
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <input className={inputCls} type="number" placeholder="Сумма" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
              <input className={inputCls} placeholder="Комментарий (необязательно)" maxLength={80} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
            </div>
            <p className="text-[11px] text-muted-foreground">Положительная сумма пополняет фонд, отрицательная списывает.</p>
            <Button variant="secondary" disabled={busy || !Number(adj.amount)} onClick={() => run({ action: "fund_adjust", amount: Number(adj.amount), note: adj.note }, "Фонд обновлён", () => setAdj({ amount: "", note: "" }))}>
              Применить
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Gift" size={15} className="text-primary" /> Выплатить участнику</h2>
            <div className="grid grid-cols-[90px_110px_1fr] gap-2">
              <input className={inputCls} type="number" placeholder="№ юзера" value={pay.userId} onChange={(e) => setPay({ ...pay, userId: e.target.value })} />
              <input className={inputCls} type="number" placeholder="Сумма" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <input className={inputCls} placeholder="За что (приз, конкурс…)" maxLength={80} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
            </div>
            <p className="text-[11px] text-muted-foreground">Сумма уйдёт из фонда на кошелёк TKA участника. Номер участника виден в разделе «Пользователи».</p>
            <Button disabled={busy || !Number(pay.amount) || !Number(pay.userId)} onClick={() => run({ action: "fund_payout", userId: Number(pay.userId), amount: Number(pay.amount), note: pay.note }, "Выплата отправлена", () => setPay({ userId: "", amount: "", note: "" }))}>
              Выплатить
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-white font-semibold text-sm mb-2">Последние операции</h2>
        {data.ops.length === 0 ? (
          <p className="text-sm text-muted-foreground">Операций пока нет.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.ops.map((o) => (
              <div key={o.id} className="flex items-center gap-3 py-1.5 text-sm">
                <Icon name={o.amount >= 0 ? "ArrowDownLeft" : "ArrowUpRight"} size={14} className={o.amount >= 0 ? "text-[#22C55E]" : "text-[#EA3943]"} />
                <div className="min-w-0 flex-1">
                  <div className="text-white truncate">{o.note || KIND[o.kind] || o.kind}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {KIND[o.kind] ?? o.kind} · {o.user} · {new Date(o.at + "Z").toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span className={`font-mono ${o.amount >= 0 ? "text-[#22C55E]" : "text-[#EA3943]"}`}>
                  {o.amount > 0 ? "+" : o.amount < 0 ? "−" : ""}{fundFmt(Math.abs(o.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FundManager;
