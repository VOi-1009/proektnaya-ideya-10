import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { ExchangeFlow, fmtUsd, useExchangeFlows } from "@/lib/radars";

type Period = "flow24h" | "flow7d" | "flow30d";
const PERIODS: [Period, string][] = [
  ["flow24h", "24 часа"],
  ["flow7d", "7 дней"],
  ["flow30d", "30 дней"],
];

const fmtFlow = (v: number) => {
  if (!v) return "—";
  return `${v > 0 ? "+" : "−"}${fmtUsd(Math.abs(v))}`;
};
const flowColor = (v: number) => (v > 0 ? "text-up" : v < 0 ? "text-down" : "text-muted-foreground");

const Summary = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-rail/60 rounded-lg px-3 py-2 border-l-4" style={{ borderColor: value >= 0 ? "hsl(var(--up))" : "hsl(var(--down))" }}>
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className={`font-mono text-sm tabular ${flowColor(value)}`}>{fmtFlow(value)}</div>
  </div>
);

const Row = ({ e, i, period, max }: { e: ExchangeFlow; i: number; period: Period; max: number }) => {
  const v = e[period];
  const w = max ? Math.min(100, (Math.abs(v) / max) * 100) : 0;
  return (
    <tr className="border-b border-border last:border-0 hover:bg-hover/40 transition-colors">
      <td className="px-3 py-2.5 font-mono text-muted-foreground">{i + 1}</td>
      <td className="px-3 py-2.5 text-white font-semibold">{e.name}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular text-white hidden sm:table-cell">{fmtUsd(e.assets)}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-3">
          <div className="hidden md:block w-28 h-1.5 rounded-full bg-rail overflow-hidden">
            <div className={`h-full rounded-full ${v >= 0 ? "bg-up" : "bg-down"}`} style={{ width: `${w}%` }} />
          </div>
          <span className={`font-mono tabular w-28 text-right ${flowColor(v)}`}>{fmtFlow(v)}</span>
        </div>
      </td>
    </tr>
  );
};

const ExchangeFlowsTable = () => {
  const [period, setPeriod] = useState<Period>("flow24h");
  const { data, isLoading, isError, refetch, isFetching } = useExchangeFlows(true);

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

  const list = data.items.filter((e) => e.assets > 0).sort((a, b) => b.assets - a.assets).slice(0, 30);
  const max = Math.max(...list.map((e) => Math.abs(e[period])), 1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Summary label="Чистый поток, 24 часа" value={data.total24h} />
        <Summary label="Чистый поток, 7 дней" value={data.total7d} />
        <Summary label="Чистый поток, 30 дней" value={data.total30d} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-rail rounded-lg p-1">
          {PERIODS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPeriod(id)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${period === id ? "bg-hover text-white font-semibold" : "text-muted-foreground hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5">
          {isFetching && <Icon name="Loader2" size={12} className="animate-spin" />}
          CoinMarketCap · обновлено {new Date(data.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="text-left font-semibold px-3 py-2 w-8">#</th>
              <th className="text-left font-semibold px-3 py-2">Биржа</th>
              <th className="text-right font-semibold px-3 py-2 hidden sm:table-cell">Активы</th>
              <th className="text-right font-semibold px-3 py-2">Чистый поток</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e, i) => (
              <Row key={e.slug || e.name} e={e} i={i} period={period} max={max} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Положительный поток означает приток активов на биржу, отрицательный — вывод с биржи. Показаны 30 крупнейших бирж по объёму активов.
      </div>
    </div>
  );
};

export default ExchangeFlowsTable;
