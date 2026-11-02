import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { fundRequest } from "@/lib/fund";
import { usd } from "./trading/shared";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

interface Pool { id: number; slug: string; name: string; symbol: string; termDays: number; apy: number; minAmount: number; maxTotal: number; enabled: boolean; staked: number; stakers: number }
interface Data { pools: Pool[]; coins: { slug: string; name: string; symbol: string }[]; terms: number[]; totalStaked: number; stakers: number; paid: number }

const termText = (d: number) => (d ? `${d} дн.` : "Гибкий");

const StakingManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["staking-admin", token];
  const { data } = useQuery({ queryKey: key, enabled: !!token, refetchInterval: 30_000, queryFn: () => fundRequest<Data>(token, "?action=staking_admin") });
  const [form, setForm] = useState({ slug: "", termDays: "0", apy: "10", minAmount: "10", maxTotal: "0", enabled: true });
  const [busy, setBusy] = useState(false);

  const run = async (body: object, ok: string) => {
    setBusy(true);
    try {
      qc.setQueryData(key, await fundRequest<Data>(token, "", body));
      qc.invalidateQueries({ queryKey: ["staking"] });
      toast({ title: ok });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const slug = form.slug || data.coins[0]?.slug || "";
  const set = (k: keyof typeof form, v: string | boolean) => setForm({ ...form, [k]: v });
  const save = () => run({ action: "stake_pool_save", ...form, slug, termDays: Number(form.termDays), apy: Number(form.apy), minAmount: Number(form.minAmount), maxTotal: Number(form.maxTotal) }, "Пул сохранён");

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white flex items-center gap-2"><Icon name="Coins" size={22} className="text-primary" /> Стейкинг</h1>
        <p className="text-muted-foreground text-sm max-w-3xl">Для каждой монеты из листинга задайте годовую доходность, минимальную сумму и срок. Игрок вносит USDT по текущему курсу, а награда начисляется в USDT с баланса биржи.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["В стейкинге", usd(data.totalStaked)], ["Участников", String(data.stakers)], ["Выплачено наград", usd(data.paid)]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border bg-card p-3"><div className="text-[11px] text-muted-foreground">{l}</div><div className="text-white font-mono text-sm">{v}</div></div>
        ))}
      </div>

      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">Новый или изменённый пул</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="space-y-1 block"><span className="text-xs text-muted-foreground">Монета</span>
            <select className={inputCls} value={slug} onChange={(e) => set("slug", e.target.value)}>
              {data.coins.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.symbol})</option>)}
            </select></label>
          <label className="space-y-1 block"><span className="text-xs text-muted-foreground">Срок</span>
            <select className={inputCls} value={form.termDays} onChange={(e) => set("termDays", e.target.value)}>
              {data.terms.map((t) => <option key={t} value={t}>{t ? `${t} дней` : "Гибкий"}</option>)}
            </select></label>
          <label className="space-y-1 block"><span className="text-xs text-muted-foreground">Доходность, % годовых</span><input className={inputCls} type="number" min={0} step="any" value={form.apy} onChange={(e) => set("apy", e.target.value)} /></label>
          <label className="space-y-1 block"><span className="text-xs text-muted-foreground">Мин. сумма, USDT</span><input className={inputCls} type="number" min={0} step="any" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} /></label>
          <label className="space-y-1 block"><span className="text-xs text-muted-foreground">Лимит пула, USDT</span><input className={inputCls} type="number" min={0} step="any" value={form.maxTotal} onChange={(e) => set("maxTotal", e.target.value)} /><span className="text-[10px] text-muted-foreground">0 — без лимита</span></label>
          <label className="flex items-center gap-2 pt-6 text-sm text-white cursor-pointer"><Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} /> Включён</label>
        </div>
        <Button disabled={busy || !slug} onClick={save}>Сохранить пул</Button>
        {!data.coins.length && <p className="text-xs text-muted-foreground">Сначала создайте монету в разделе «Листинг».</p>}
      </section>

      <section className="bg-card border border-border rounded-lg divide-y divide-border">
        {data.pools.length === 0 && <p className="text-sm text-muted-foreground p-6 text-center">Пулов пока нет.</p>}
        {data.pools.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-semibold">{p.name} <span className="text-muted-foreground font-mono text-xs">{p.symbol}</span> · {termText(p.termDays)} {!p.enabled && <span className="text-[10px] text-[#FBBF24] border border-[#FBBF24]/40 rounded px-1.5 py-0.5 ml-1">Отключён</span>}</div>
              <div className="text-[11px] text-muted-foreground">{p.apy}% годовых · от {usd(p.minAmount)} · внесено {usd(p.staked)}{p.maxTotal ? ` из ${usd(p.maxTotal)}` : ""} · участников {p.stakers}</div>
            </div>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setForm({ slug: p.slug, termDays: String(p.termDays), apy: String(p.apy), minAmount: String(p.minAmount), maxTotal: String(p.maxTotal), enabled: p.enabled })}>Изменить</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ action: "stake_pool_delete", id: p.id }, "Пул удалён")}>Удалить</Button>
          </div>
        ))}
      </section>
    </div>
  );
};

export default StakingManager;
