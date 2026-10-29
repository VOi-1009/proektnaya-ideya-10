import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtUsd, useLiqMap } from "@/lib/radars";

const LONG = "#22c55e";
const SHORT = "#ef4444";

const fmtP = (p: number) => `$${Math.round(p).toLocaleString("ru-RU")}`;

const LiqBars = ({ symbol, range }: { symbol: string; range: string }) => {
  const { data, isLoading, isError, refetch } = useLiqMap(symbol, range, true);

  if (isLoading) return <Skeleton className="w-full h-[380px] sm:h-[460px] bg-rail" />;
  if (isError || !data)
    return (
      <div className="h-[380px] flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        Данные Binance временно недоступны
        <button onClick={() => refetch()} className="text-primary hover:underline">
          Повторить
        </button>
      </div>
    );

  const bars = data.bars.filter((b) => b.long || b.short || b.cumLong || b.cumShort);
  const total = data.totalLong + data.totalShort || 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-rail/60 rounded-lg px-3 py-2 border-l-4" style={{ borderColor: LONG }}>
          <div className="text-[11px] text-muted-foreground">Ликвидации лонгов (ниже цены)</div>
          <div className="font-mono text-white text-sm">
            {fmtUsd(data.totalLong)} <span className="text-[10px] text-muted-foreground">{Math.round((data.totalLong / total) * 100)}%</span>
          </div>
        </div>
        <div className="bg-rail/60 rounded-lg px-3 py-2 border-l-4" style={{ borderColor: SHORT }}>
          <div className="text-[11px] text-muted-foreground">Ликвидации шортов (выше цены)</div>
          <div className="font-mono text-white text-sm">
            {fmtUsd(data.totalShort)} <span className="text-[10px] text-muted-foreground">{Math.round((data.totalShort / total) * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="h-[380px] sm:h-[460px] rounded-lg border border-border bg-rail/30 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={bars} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap={0}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="price" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fmtP} tick={{ fill: "#9ca3af", fontSize: 11 }} tickCount={7} />
            <YAxis yAxisId="bar" tickFormatter={(v) => fmtUsd(v)} tick={{ fill: "#9ca3af", fontSize: 11 }} width={64} />
            <YAxis yAxisId="cum" orientation="right" tickFormatter={(v) => fmtUsd(v)} tick={{ fill: "#9ca3af", fontSize: 11 }} width={64} />
            <Tooltip
              contentStyle={{ background: "#1b1b22", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(v) => fmtP(Number(v))}
              formatter={(v: number, n: string) => [fmtUsd(v), n]}
            />
            <Bar yAxisId="bar" dataKey="long" name="Лонги" fill={LONG} isAnimationActive={false} />
            <Bar yAxisId="bar" dataKey="short" name="Шорты" fill={SHORT} isAnimationActive={false} />
            <Line yAxisId="cum" dataKey="cumLong" name="Накопление лонгов" stroke={LONG} dot={false} strokeWidth={2} isAnimationActive={false} connectNulls />
            <Line yAxisId="cum" dataKey="cumShort" name="Накопление шортов" stroke={SHORT} dot={false} strokeWidth={2} isAnimationActive={false} connectNulls />
            <ReferenceLine
              yAxisId="bar"
              x={data.price}
              stroke="#facc15"
              strokeDasharray="4 3"
              label={{ value: fmtP(data.price), fill: "#facc15", fontSize: 11, position: "top" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {data.source} · расчётная оценка по открытому интересу и плечам 5–100x · обновлено{" "}
        {new Date(data.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
};

export default LiqBars;
