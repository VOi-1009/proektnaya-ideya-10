import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import TkaIcon from "../TkaIcon";
import { useAuth } from "@/lib/auth";
import { fundFmt, useFund } from "@/lib/fund";
import ContestsList from "../ContestsList";

const KIND: Record<string, string> = { fee: "Комиссия обмена", deposit: "Пополнение", adjust: "Корректировка", payout: "Выплата участнику", contest: "Приз конкурса" };

const FundChannel = () => {
  const { token } = useAuth();
  const { data, isLoading } = useFund(token);

  if (isLoading || !data) return <Skeleton className="h-64 w-full max-w-3xl mx-auto bg-card" />;
  const pct = data.goal > 0 ? Math.min(100, (data.total / data.goal) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="Landmark" size={20} className="text-primary" />
          <h2 className="font-display text-lg text-white">{data.title}</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <TkaIcon size={34} />
          <span className="font-display text-4xl text-white leading-none">{fundFmt(data.total)}</span>
          <span className="text-sm font-semibold text-primary">TKA</span>
        </div>
        {data.description && <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>}
        {data.goal > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Цель фонда</span>
              <span className="font-mono text-white">{fundFmt(data.total)} / {fundFmt(data.goal)} TKA · {pct.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-rail overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-rail/50 px-2.5 py-2">
            <div className="text-muted-foreground">Комиссия обмена</div>
            <div className="font-mono text-white">{(data.rate * 100).toFixed(2).replace(".", ",")}%</div>
          </div>
          <div className="rounded-lg bg-rail/50 px-2.5 py-2">
            <div className="text-muted-foreground">Участников внесли</div>
            <div className="font-mono text-white">{data.donors}</div>
          </div>
          <div className="rounded-lg bg-rail/50 px-2.5 py-2">
            <div className="text-muted-foreground">Ваш вклад</div>
            <div className="font-mono text-white">{token ? fundFmt(data.mine) : "—"}</div>
          </div>
        </div>
      </section>

      <ContestsList />

      <div className="grid sm:grid-cols-2 gap-4">
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-1.5"><Icon name="Trophy" size={14} className="text-primary" /> Больше всех внесли</h3>
          {data.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока никто не вносил.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.top.map((t, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="w-5 text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate text-white">{t.name}</span>
                  <span className="font-mono text-muted-foreground">{fundFmt(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-1.5"><Icon name="History" size={14} className="text-primary" /> Последние операции</h3>
          {data.last.length === 0 ? (
            <p className="text-sm text-muted-foreground">Операций пока нет.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.last.slice(0, 8).map((o, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                  <Icon name={o.amount >= 0 ? "ArrowDownLeft" : "ArrowUpRight"} size={13} className={o.amount >= 0 ? "text-[#22C55E]" : "text-[#EA3943]"} />
                  <div className="min-w-0 flex-1">
                    <div className="text-white truncate">{KIND[o.kind] ?? o.kind}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(o.at + "Z").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</div>
                  </div>
                  <span className="font-mono text-muted-foreground">{o.amount > 0 ? "+" : "−"}{fundFmt(Math.abs(o.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default FundChannel;
