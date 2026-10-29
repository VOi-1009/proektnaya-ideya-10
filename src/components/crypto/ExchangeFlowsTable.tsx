import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { ExchangeFlow, fmtUsd, useExchangeFlows } from "@/lib/radars";

type SortKey = "assets" | "oi" | "flow24h" | "flow7d" | "flow30d";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "assets", label: "Активы" },
  { key: "oi", label: "Открытый интерес" },
  { key: "flow24h", label: "Чистый приток (24ч)" },
  { key: "flow7d", label: "Чистые потоки (7д)" },
  { key: "flow30d", label: "Чистые потоки (30д)" },
];

const fmtFlow = (v: number) => (v ? `${v > 0 ? "+" : "−"}${fmtUsd(Math.abs(v))}` : "—");
const flowColor = (v: number) => (v > 0 ? "text-lime-400" : v < 0 ? "text-down" : "text-muted-foreground");

const Summary = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-rail/60 rounded-lg px-3 py-2 border-l-4" style={{ borderColor: value >= 0 ? "#a3e635" : "hsl(var(--down))" }}>
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className={`font-mono text-sm tabular ${flowColor(value)}`}>{fmtFlow(value)}</div>
  </div>
);

const Logo = ({ e }: { e: ExchangeFlow }) => {
  const [err, setErr] = useState(false);
  return e.id && !err ? (
    <img src={`/exchanges/${e.id}.png`} alt="" width={24} height={24} className="w-6 h-6 rounded-full flex-shrink-0 bg-white/5" loading="lazy" onError={() => setErr(true)} />
  ) : (
    <span className="w-6 h-6 rounded-full flex-shrink-0 bg-rail text-white text-[9px] font-bold flex items-center justify-center">{e.name.slice(0, 2).toUpperCase()}</span>
  );
};

const Row = ({ e, i }: { e: ExchangeFlow; i: number }) => (
  <tr className="border-b border-border last:border-0 hover:bg-hover/40 transition-colors">
    <td className="px-3 py-2.5 font-mono text-muted-foreground">{i + 1}</td>
    <td className="px-3 py-2.5 text-white font-semibold whitespace-nowrap">
      <div className="flex items-center gap-2.5">
        <Logo e={e} />
        {e.name}
      </div>
    </td>
    <td className="px-3 py-2.5 text-right font-mono tabular text-white whitespace-nowrap">{e.assets ? fmtUsd(e.assets) : "—"}</td>
    <td className="px-3 py-2.5 text-right font-mono tabular text-white whitespace-nowrap">{e.oi ? fmtUsd(e.oi) : "—"}</td>
    {(["flow24h", "flow7d", "flow30d"] as const).map((k) => (
      <td key={k} className={`px-3 py-2.5 text-right font-mono tabular whitespace-nowrap ${flowColor(e[k])}`}>
        {fmtFlow(e[k])}
      </td>
    ))}
  </tr>
);

const ExchangeFlowsTable = () => {
  const [sort, setSort] = useState<SortKey>("assets");
  const [desc, setDesc] = useState(true);
  const { data, isLoading, isError, refetch, isFetching } = useExchangeFlows(true);

  const list = useMemo(() => {
    const top = (data?.items ?? []).filter((e) => e.assets > 0).sort((a, b) => b.assets - a.assets).slice(0, 20);
    return top.sort((a, b) => (desc ? b[sort] - a[sort] : a[sort] - b[sort]));
  }, [data, sort, desc]);

  const onSort = (k: SortKey) => {
    if (k === sort) setDesc(!desc);
    else {
      setSort(k);
      setDesc(true);
    }
  };

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
      <div className="grid grid-cols-3 gap-2">
        <Summary label="Чистый поток, 24 часа" value={data.total24h} />
        <Summary label="Чистый поток, 7 дней" value={data.total7d} />
        <Summary label="Чистый поток, 30 дней" value={data.total30d} />
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5 justify-end">
        {isFetching && <Icon name="Loader2" size={12} className="animate-spin" />}
        CoinMarketCap · обновлено {new Date(data.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="text-left font-semibold px-3 py-2 w-8">#</th>
              <th className="text-left font-semibold px-3 py-2">Биржа</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="text-right font-semibold px-3 py-2">
                  <button
                    onClick={() => onSort(c.key)}
                    className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-white ${sort === c.key ? "text-white" : ""}`}
                  >
                    {c.label}
                    <Icon name={sort === c.key ? (desc ? "ArrowDown" : "ArrowUp") : "ArrowUpDown"} size={11} className={sort === c.key ? "text-primary" : "opacity-50"} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((e, i) => (
              <Row key={e.slug || e.name} e={e} i={i} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Положительный поток означает приток активов на биржу, отрицательный — вывод с биржи. Показаны 20 крупнейших бирж по объёму активов, сортировка по клику на заголовок колонки.
      </div>
    </div>
  );
};

export default ExchangeFlowsTable;
