import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPct, fmtPrice } from "@/lib/crypto";

type Candle = { t: number; o: number; h: number; l: number; c: number };

const useBtc5m = () =>
  useQuery<Candle[]>({
    queryKey: ["btc-5m"],
    queryFn: async () => {
      const r = await fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=144");
      if (!r.ok) throw new Error("bad");
      const d = (await r.json()) as (string | number)[][];
      return d.map((k) => ({ t: Number(k[0]), o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

const hm = (t: number) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const BtcLiveChart = ({ onOpen }: { onOpen: () => void }) => {
  const { data, isLoading, isError } = useBtc5m();
  const first = data?.[0]?.o ?? 0;
  const last = data?.[data.length - 1]?.c ?? 0;
  const change = first ? ((last - first) / first) * 100 : 0;
  const up = change >= 0;
  const color = up ? "hsl(var(--up))" : "hsl(var(--down))";
  const hi = data?.length ? Math.max(...data.map((d) => d.h)) : 0;
  const lo = data?.length ? Math.min(...data.map((d) => d.l)) : 0;

  return (
    <div className="p-4 sm:p-5 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" /> Bitcoin · свечи 5 минут
          </div>
          {data && (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-2xl text-white tabular">{fmtPrice(last)}</span>
              <span className={`font-mono text-sm tabular ${up ? "text-up" : "text-down"}`}>{fmtPct(change)} за 12 ч</span>
            </div>
          )}
        </div>
        <button onClick={onOpen} className="text-xs text-primary hover:underline flex-shrink-0 mt-0.5">
          Подробнее →
        </button>
      </div>
      <div className="flex-1 min-h-[200px]">
        {isLoading ? (
          <Skeleton className="w-full h-full min-h-[200px] bg-rail" />
        ) : isError || !data?.length ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">График временно недоступен</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="btc5m" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tickFormatter={hm} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis
                domain={["dataMin", "dataMax"]}
                orientation="right"
                width={62}
                tickFormatter={(v: number) => fmtPrice(v)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(t: number) => hm(t)}
                formatter={(v: number) => [fmtPrice(v), "Цена"]}
              />
              <Area type="monotone" dataKey="c" stroke={color} strokeWidth={2} fill="url(#btc5m)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {data && (
        <div className="flex justify-between text-[11px] font-mono text-muted-foreground mt-2">
          <span>
            Мин: <span className="text-white">{fmtPrice(lo)}</span>
          </span>
          <span>
            Макс: <span className="text-white">{fmtPrice(hi)}</span>
          </span>
          <span>обновл. каждую минуту</span>
        </div>
      )}
    </div>
  );
};

export default BtcLiveChart;
