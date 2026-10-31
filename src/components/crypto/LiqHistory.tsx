import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtUsd } from "@/lib/radars";
import func2url from "../../../backend/func2url.json";

interface Bar24 {
  t: number;
  longs: number;
  shorts: number;
  price: number | null;
}

interface Hist {
  bars: Bar24[];
  totalLongs: number;
  totalShorts: number;
}

const LONG = "#22c55e";
const SHORT = "#ef4444";
const PRICE = "#9ca3af";

const hm = (t: number) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const LiqHistory = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["liqhist", "24h"],
    queryFn: async () => {
      const r = await fetch(`${func2url.news}?resource=liqhist`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.bars) throw new Error(d.error ?? "История ликвидаций недоступна");
      return d as Hist;
    },
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const total = data ? data.totalLongs + data.totalShorts : 0;

  return (
    <div className="p-3 h-full flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-white text-sm font-semibold leading-tight">Исторический график ликвидаций</div>
          <div className="text-[10px] text-muted-foreground">Все монеты · все биржи · 24 часа</div>
        </div>
        {data && <div className="font-mono text-white text-sm whitespace-nowrap">{fmtUsd(total)}</div>}
      </div>

      {data && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: LONG }} />
            Лонги <span className="font-mono text-white">{fmtUsd(data.totalLongs)}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: SHORT }} />
            Шорты <span className="font-mono text-white">{fmtUsd(data.totalShorts)}</span>
          </span>
        </div>
      )}

      <div className="flex-1 min-h-[160px]">
        {isLoading && <Skeleton className="w-full h-full min-h-[160px] bg-rail" />}
        {isError && (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            Данные временно недоступны
            <button onClick={() => refetch()} className="text-primary hover:underline">
              Повторить
            </button>
          </div>
        )}
        {data && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.bars} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="12%">
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" tickFormatter={hm} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis yAxisId="liq" orientation="left" tickFormatter={(v) => fmtUsd(v).replace(" млн", "M").replace(" тыс", "K").replace(" млрд", "B")} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
              <YAxis yAxisId="price" orientation="right" hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#1b1b22", border: "1px solid #333", borderRadius: 8, fontSize: 11 }}
                labelFormatter={(v) => hm(Number(v))}
                formatter={(v: number, n: string) => [n === "Цена BTC" ? `$${Math.round(v).toLocaleString("ru-RU")}` : fmtUsd(v), n]}
              />
              <Bar yAxisId="liq" dataKey="longs" name="Лонги" stackId="l" fill={LONG} isAnimationActive={false} />
              <Bar yAxisId="liq" dataKey="shorts" name="Шорты" stackId="l" fill={SHORT} isAnimationActive={false} />
              <Line yAxisId="price" dataKey="price" name="Цена BTC" stroke={PRICE} dot={false} strokeWidth={1.5} isAnimationActive={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default LiqHistory;
