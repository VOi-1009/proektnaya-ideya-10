import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { fundRequest } from "@/lib/fund";
import { usd } from "./shared";

interface Pool { id: number; slug: string; name: string; symbol: string; termDays: number; apy: number; minAmount: number; maxTotal: number; staked: number }
interface Stake { id: number; symbol: string; termDays: number; amount: number; apy: number; endsAt: string; earned: number; locked: boolean }
interface Data { pools: Pool[]; stakes: Stake[]; balance: number }

const StakingCard = () => {
  const { token } = useAuth();
  const qc = useQueryClient();
  const key = ["staking", token];
  const { data } = useQuery({ queryKey: key, enabled: !!token, refetchInterval: 60_000, queryFn: () => fundRequest<Data>(token, "?action=staking") });
  const [sel, setSel] = useState(0);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  if (!data || (!data.pools.length && !data.stakes.length)) return null;
  const pool = data.pools.find((p) => p.id === sel) ?? data.pools[0];
  const amt = Number(amount) > 0 ? Number(amount) : 0;
  const perDay = pool ? (amt * pool.apy) / 100 / 365 : 0;
  const total = pool ? (pool.termDays ? perDay * pool.termDays : (amt * pool.apy) / 100) : 0;

  const run = async (body: object, ok: string) => {
    setBusy(true);
    try {
      const next = await fundRequest<Data & { reward?: number }>(token, "", body);
      qc.setQueryData(key, next);
      qc.invalidateQueries({ queryKey: ["state"] });
      toast({ title: next.reward !== undefined ? `${ok}: награда ${usd(next.reward)}` : ok });
      setAmount("");
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-3 space-y-3">
      <h3 className="font-display text-sm text-white">Стейкинг</h3>
      {pool && (
        <div className="space-y-2">
          <div className="space-y-1">
            {data.pools.map((p) => (
              <button key={p.id} onClick={() => setSel(p.id)} className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left border transition-colors ${p.id === pool.id ? "border-primary/60 bg-primary/10" : "border-transparent bg-rail/70"}`}>
                <span className="text-xs text-white">{p.symbol} · {p.termDays ? `${p.termDays} дн.` : "гибкий"}</span>
                <span className="text-[10px] text-muted-foreground text-right"><span className="text-[#22C55E] font-mono text-xs">{p.apy}%</span> годовых · от {usd(p.minAmount)}</span>
              </button>
            ))}
          </div>
          <input className="w-full bg-rail rounded px-3 h-9 text-sm text-white outline-none" type="number" min={0} placeholder={`Сумма в USDT, от ${pool.minAmount}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          {amt > 0 && (
            <div className="rounded-lg bg-rail/70 px-2.5 py-1.5 text-[11px] text-muted-foreground space-y-0.5">
              <div className="flex justify-between"><span>В день</span><span className="font-mono text-white">+{usd(perDay)}</span></div>
              <div className="flex justify-between"><span>{pool.termDays ? `За ${pool.termDays} дн.` : "За год"}</span><span className="font-mono text-[#22C55E]">+{usd(total)}</span></div>
            </div>
          )}
          <Button className="w-full" size="sm" disabled={busy || !(Number(amount) > 0)} onClick={() => run({ action: "stake_open", poolId: pool.id, amount: Number(amount) }, "Монеты в стейкинге")}>Вложить</Button>
          <p className="text-[10px] text-muted-foreground">Свободно {usd(data.balance)}. Вложенная сумма пересчитывается в монету по текущему курсу, награда считается в USDT.</p>
        </div>
      )}
      {data.stakes.length > 0 && (
        <div className="divide-y divide-border">
          {data.stakes.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white">{s.symbol} · {usd(s.amount)} · {s.apy}%</div>
                <div className="text-[10px] text-muted-foreground">Награда {usd(s.earned)}{s.endsAt ? ` · до ${new Date(s.endsAt).toLocaleDateString("ru-RU")}` : ""}</div>
              </div>
              <Button size="sm" variant="outline" disabled={busy || s.locked} onClick={() => run({ action: "stake_close", id: s.id }, "Стейк закрыт")}>{s.locked ? "Заблокирован" : "Забрать"}</Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default StakingCard;
