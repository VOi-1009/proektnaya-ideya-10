import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtUsd, TopTx, useTopTxs } from "@/lib/radars";

const fmtCount = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(".", ",")} млн` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(".", ",")} тыс` : String(n);

const fmtPrice = (p: number) =>
  `$${p.toLocaleString("ru-RU", { minimumFractionDigits: p < 1 ? 4 : 2, maximumFractionDigits: p < 1 ? 5 : 2 })}`;

const Logo = ({ c }: { c: TopTx }) => {
  const [err, setErr] = useState(false);
  return c.logo && !err ? (
    <img src={c.logo} alt="" className="w-7 h-7 rounded-full flex-shrink-0 bg-white/5" onError={() => setErr(true)} loading="lazy" />
  ) : (
    <span className="w-7 h-7 rounded-full flex-shrink-0 bg-rail text-white text-[9px] font-bold flex items-center justify-center">
      {c.symbol.slice(0, 3)}
    </span>
  );
};

const TopTxsTable = ({ color }: { color: string }) => {
  const { data, isLoading, isError, refetch, isFetching } = useTopTxs(true);
  const max = Math.max(...(data?.items.map((i) => i.txs) ?? [1]));

  if (isLoading) return <Skeleton className="w-full h-[420px] bg-rail" />;
  if (isError || !data)
    return (
      <div className="h-60 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        Данные временно недоступны
        <button onClick={() => refetch()} className="text-primary hover:underline">
          Повторить
        </button>
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5 justify-end">
        {isFetching && <Icon name="Loader2" size={12} className="animate-spin" />}
        TradingView · обновлено {new Date(data.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="text-left font-semibold px-3 py-2 w-8">#</th>
              <th className="text-left font-semibold px-3 py-2">Монета</th>
              <th className="text-right font-semibold px-3 py-2">Кол-во сделок</th>
              <th className="text-right font-semibold px-3 py-2">Цена</th>
              <th className="text-right font-semibold px-3 py-2">24ч</th>
              <th className="text-right font-semibold px-3 py-2 hidden sm:table-cell">Объём 24ч</th>
              <th className="text-right font-semibold px-3 py-2 hidden md:table-cell">Капитализация</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => {
              const up = (c.change ?? 0) >= 0;
              return (
                <tr key={c.symbol} className="border-b border-border last:border-0 hover:bg-hover/40 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{c.place}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Logo c={c} />
                      <div className="min-w-0 leading-tight">
                        <div className="text-white font-semibold">{c.symbol}</div>
                        <div className="text-muted-foreground text-xs truncate">{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="font-mono text-white tabular">{fmtCount(c.txs)}</div>
                    <div className="h-1 mt-1 rounded-full bg-rail overflow-hidden ml-auto w-24">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(3, (c.txs / max) * 100)}%`, background: color }} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-white tabular">{c.price != null ? fmtPrice(c.price) : "—"}</td>
                  <td className={`px-3 py-2.5 text-right font-mono tabular ${up ? "text-up" : "text-down"}`}>
                    {c.change != null ? `${up ? "+" : ""}${c.change.toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground tabular hidden sm:table-cell">
                    {c.volume ? fmtUsd(c.volume) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground tabular hidden md:table-cell">
                    {c.marketCap ? fmtUsd(c.marketCap) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Количество транзакций в блокчейне монеты за последние 24 часа. Много сделок — признак активной сети и интереса пользователей.
      </p>
    </div>
  );
};

export default TopTxsTable;
