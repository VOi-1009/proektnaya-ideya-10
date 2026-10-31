import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtPrice, useChart } from "@/lib/crypto";
import { Skeleton } from "@/components/ui/skeleton";

const RANGES = [
  { d: 1, label: "1Д" },
  { d: 7, label: "1Н" },
  { d: 30, label: "1М" },
  { d: 90, label: "3М" },
];

interface Candle { t: number; o: number; h: number; l: number; c: number; range: [number, number] }
interface Line { price: number; label: string; color: string }

const UP = "hsl(var(--up))";
const DOWN = "hsl(var(--down))";

const fromOhlc = (rows: number[][]): Candle[] =>
  rows.map(([t, o, h, l, c]) => ({ t, o, h, l, c, range: [l, h] }));

const fromPoints = (pts: { t: number; p: number }[]): Candle[] => {
  const size = Math.max(2, Math.floor(pts.length / 60));
  const out: Candle[] = [];
  for (let i = 0; i < pts.length; i += size) {
    const g = pts.slice(i, i + size);
    const ps = g.map((x) => x.p);
    const h = Math.max(...ps);
    const l = Math.min(...ps);
    out.push({ t: g[0].t, o: ps[0], h, l, c: ps[ps.length - 1], range: [l, h] });
  }
  return out;
};

const CandleShape = (props: { x?: number; y?: number; width?: number; height?: number; payload?: Candle }) => {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;
  const { o, h, l, c } = payload;
  const color = c >= o ? UP : DOWN;
  const span = h - l || 1;
  const k = height / span;
  const top = y + (h - Math.max(o, c)) * k;
  const body = Math.max(Math.abs(c - o) * k, 1);
  const cx = x + width / 2;
  const bw = Math.max(width * 0.7, 2);
  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={cx - bw / 2} y={top} width={bw} height={body} fill={color} />
    </g>
  );
};

interface Props { coinId: string; price: number; lines?: Line[] }

const CandleChart = ({ coinId, price, lines = [] }: Props) => {
  const [days, setDays] = useState(1);
  const { data: line } = useChart(coinId, days, price);
  const { data, isLoading } = useQuery<Candle[]>({
    queryKey: ["ohlc", coinId, days, line?.length ?? 0],
    queryFn: async () => {
      try {
        const r = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`);
        if (!r.ok) throw new Error("bad");
        const rows = (await r.json()) as number[][];
        if (!Array.isArray(rows) || rows.length < 5) throw new Error("empty");
        return fromOhlc(rows);
      } catch {
        return fromPoints(line ?? []);
      }
    },
    enabled: !!line,
    staleTime: 60_000,
  });

  const fmtTick = (t: number) => {
    const d = new Date(t);
    return days <= 1
      ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-white">График</h3>
        <div className="flex bg-rail rounded p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.d}
              onClick={() => setDays(r.d)}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                days === r.d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[300px] sm:h-[380px]">
        {isLoading || !data ? (
          <Skeleton className="w-full h-full bg-rail" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
              <XAxis dataKey="t" tickFormatter={fmtTick} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={50} />
              <YAxis
                orientation="right"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v: number) => fmtPrice(v, coinId)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  const p = active ? (payload?.[0]?.payload as Candle | undefined) : undefined;
                  if (!p) return null;
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs font-mono text-white space-y-0.5">
                      <div className="text-muted-foreground">{new Date(p.t).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      <div>Откр. {fmtPrice(p.o, coinId)}</div>
                      <div>Макс. {fmtPrice(p.h, coinId)}</div>
                      <div>Мин. {fmtPrice(p.l, coinId)}</div>
                      <div>Закр. {fmtPrice(p.c, coinId)}</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="range" shape={<CandleShape />} isAnimationActive={false} />
              {lines.map((l, i) => (
                <ReferenceLine key={i} y={l.price} stroke={l.color} strokeDasharray="4 4" label={{ value: l.label, fill: l.color, fontSize: 10, position: "insideTopLeft" }} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default CandleChart;
