import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartPoint, Coin, fetchChart, fmtPct } from "@/lib/crypto";
import { Skeleton } from "@/components/ui/skeleton";

const RANGES = [
  { d: 7, label: "Неделя" },
  { d: 30, label: "Месяц" },
  { d: 365, label: "Год" },
];

const fmtUsd = (v: number, digits = 2) =>
  "$" + v.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtAxis = (v: number) => {
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1).replace(".", ",") + "M";
  if (v >= 1e4) return "$" + Math.round(v / 1e3) + "K";
  return fmtUsd(v, 0);
};

const priceAt = (series: ChartPoint[], t: number) => {
  let lo = 0;
  let hi = series.length - 1;
  if (t <= series[0].t) return series[0].p;
  if (t >= series[hi].t) return series[hi].p;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (series[mid].t <= t) lo = mid;
    else hi = mid;
  }
  return series[lo].p;
};

interface Props {
  holdings: { coinId: string; amount: number }[];
  coins: Coin[];
}

const PortfolioChart = ({ holdings, coins }: Props) => {
  const [days, setDays] = useState(30);

  const amounts = useMemo(() => {
    const m: Record<string, number> = {};
    holdings.forEach((h) => (m[h.coinId] = (m[h.coinId] ?? 0) + h.amount));
    return m;
  }, [holdings]);
  const ids = Object.keys(amounts).sort();

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["chart", id, days],
      queryFn: () => fetchChart(id, days, coins.find((c) => c.id === id)?.current_price),
      staleTime: 60_000,
    })),
  });

  const loading = results.some((r) => r.isLoading);
  const series = results.map((r) => r.data);

  const data = useMemo(() => {
    if (loading || !ids.length || series.some((s) => !s?.length)) return [];
    const base = series.reduce((a, b) => ((b?.length ?? 0) > (a?.length ?? 0) ? b : a))!;
    const step = Math.max(1, Math.floor(base.length / 160));
    const points = base.filter((_, i) => i % step === 0 || i === base.length - 1);
    return points.map(({ t }) => ({
      t,
      v: ids.reduce((sum, id, i) => sum + amounts[id] * priceAt(series[i]!, t), 0),
    }));
  }, [loading, ids.join(), days, results.map((r) => r.dataUpdatedAt).join(), amounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = data[0]?.v ?? 0;
  const last = data[data.length - 1]?.v ?? 0;
  const diff = last - first;
  const change = first ? (diff / first) * 100 : 0;
  const up = diff >= 0;
  const color = up ? "hsl(var(--up))" : "hsl(var(--down))";
  const label = RANGES.find((r) => r.d === days)?.label.toLowerCase();

  if (!ids.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in">
      <div className="p-4 flex flex-wrap items-start justify-between gap-3 border-b border-border">
        <div>
          <div className="text-muted-foreground text-xs">Динамика портфеля</div>
          {data.length ? (
            <div className={`font-mono text-sm tabular mt-1 ${up ? "text-up" : "text-down"}`}>
              {(up ? "+" : "−") + fmtUsd(Math.abs(diff))} ({fmtPct(change)}) за {label === "неделя" ? "неделю" : label}
            </div>
          ) : (
            <Skeleton className="h-4 w-48 mt-1.5 bg-rail" />
          )}
        </div>
        <div className="flex bg-rail rounded p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.d}
              onClick={() => setDays(r.d)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                days === r.d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[220px] sm:h-[260px] px-1 pt-4">
        {!data.length ? (
          <Skeleton className="w-full h-full bg-rail" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="pf-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                tickFormatter={(t: number) => new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                dataKey="v"
                domain={["auto", "auto"]}
                orientation="right"
                tickFormatter={fmtAxis}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--input))",
                  borderRadius: 6,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                itemStyle={{ color: "#fff" }}
                labelFormatter={(t: number) =>
                  new Date(t).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
                }
                formatter={(v: number) => [fmtUsd(v), "Стоимость"]}
              />
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#pf-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="px-4 py-2 border-t border-border text-[11px] text-muted-foreground">
        Сколько стоили бы ваши текущие монеты в каждый момент периода
      </div>
    </div>
  );
};

export default PortfolioChart;