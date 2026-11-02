import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, Cell, ComposedChart, Line as RLine, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import { useNavigate } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPrice } from "@/lib/crypto";
import { useAuth } from "@/lib/auth";
import { useListings } from "@/lib/listings";
import { Candle, CandleShape, DOWN, Line, UP, loadKlines, withIndicators } from "../candle/chartUtils";

interface Props {
  coinId: string;
  price: number;
  lines: Line[];
  liqPrice?: number;
  onQuick?: (side: "long" | "short") => void;
  quickInfo?: string;
  quickDisabled?: boolean;
  closeInfo?: string;
  closeProfit?: boolean;
  onCloseAll?: () => void;
  closeDisabled?: boolean;
}

const MINI = [
  { v: "1m", label: "1м" },
  { v: "15m", label: "15м" },
  { v: "1h", label: "1ч" },
  { v: "1d", label: "1д" },
];

const MobileChart = (p: Props) => {
  const navigate = useNavigate();
  const open = () => navigate({ to: "/chart", search: { coin: p.coinId } });
  const [iv, setIv] = useState("1m");
  const [macd, setMacd] = useState(false);
  const { token } = useAuth();
  const { data } = useQuery({
    queryKey: ["mini-candles", p.coinId, iv, !!token],
    queryFn: async () => (await loadKlines(p.coinId, iv, token)).slice(-90),
    staleTime: 15_000,
    refetchInterval: () => (typeof document !== "undefined" && document.hidden ? false : 15_000),
  });
  const candles = useMemo(() => {
    const base = data ?? [];
    if (base.length < 2 || !(p.price > 0)) return base;
    const l = base[base.length - 1];
    if (Math.abs(p.price / l.c - 1) > 0.2) return base;
    const h = Math.max(l.h, p.price);
    const lo = Math.min(l.l, p.price);
    return [...base.slice(0, -1), { ...l, c: p.price, h, l: lo, range: [lo, h] as [number, number] }];
  }, [data, p.price]);
  const view: Candle[] = useMemo(() => withIndicators(candles).slice(-45), [candles]);
  const plot: Candle[] = useMemo(() => {
    if (!view.length) return view;
    const t0 = view[view.length - 1].t;
    const pad = Array.from({ length: 5 }, (_, i) => ({ empty: true, t: t0 + (i + 1), o: 0, h: 0, l: 0, c: 0, v: 0, range: [0, 0] as [number, number] }));
    return [...view, ...pad];
  }, [view]);
  const { data: lst } = useListings();
  const fr = lst?.items.find((x) => x.slug === p.coinId)?.fundingRate ?? 0;
  const first = view[0]?.o ?? 0;
  const last = p.price || view[view.length - 1]?.c || 0;
  const pct = first ? ((last - first) / first) * 100 : 0;
  const up = pct >= 0;
  const color = up ? UP : "#EA3943";
  const entries = p.lines.filter((l) => l.label.startsWith("Лонг") || l.label.startsWith("Шорт"));
  const domain = useMemo<[number, number]>(() => {
    if (!view.length) return [0, 1];
    const lo = Math.min(...view.map((c) => c.l));
    const hi = Math.max(...view.map((c) => c.h));
    const pad = (hi - lo) * 0.08 || hi * 0.001;
    return [lo - pad, hi + pad];
  }, [view]);
  const ivLabel = MINI.find((m) => m.v === iv)?.label ?? iv;
  const pill = (on: boolean) => `px-2.5 py-0.5 text-[11px] font-mono rounded transition-colors ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`;

  return (
    <>
      <div className="w-full rounded-xl border border-border bg-card p-3">
        <button onClick={() => open()} className="w-full text-left">
          <div className="flex items-center gap-2">
            <span className="font-display text-white text-sm">График</span>
            <span className="font-mono text-white text-sm">{last ? fmtPrice(last, p.coinId) : "—"}</span>
            <span className="font-mono text-xs" style={{ color }}>{up ? "+" : ""}{pct.toFixed(2).replace(".", ",")}%</span>
            <span className="ml-auto flex items-center gap-1 text-[11px] text-primary font-semibold">
              Открыть <Icon name="Maximize2" size={13} />
            </span>
          </div>
        </button>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex bg-rail rounded p-0.5">
            {MINI.map((m) => (
              <button key={m.v} onClick={() => setIv(m.v)} className={pill(iv === m.v)}>{m.label}</button>
            ))}
          </div>
          <button onClick={() => setMacd((v) => !v)} className={`${pill(macd)} bg-rail ${macd ? "!bg-primary" : ""}`}>MACD</button>
        </div>
        <button onClick={() => open()} className="block w-full mt-2" aria-label={`График ${ivLabel}`}>
          <div className="h-36 pointer-events-none">
            {view.length < 2 ? (
              <Skeleton className="h-full w-full bg-rail" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={plot} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis
                    orientation="right"
                    domain={domain}
                    tickCount={4}
                    allowDataOverflow
                    tickFormatter={(v: number) => fmtPrice(v, p.coinId)}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Bar dataKey="range" shape={<CandleShape domain={domain} />} isAnimationActive={false} />
                  {last > 0 && (
                    <ReferenceLine
                      y={last}
                      ifOverflow="hidden"
                      stroke={color}
                      strokeDasharray="2 3"
                      label={(lp: { viewBox?: { x: number; y: number; width: number } }) => {
                        const vb = lp.viewBox;
                        if (!vb) return <g />;
                        const x = vb.x + vb.width;
                        return (
                          <g>
                            <rect x={x} y={vb.y - 8} width={52} height={16} rx={3} fill={color} />
                            <text x={x + 26} y={vb.y + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#fff" fontFamily="monospace">{fmtPrice(last, p.coinId)}</text>
                          </g>
                        );
                      }}
                    />
                  )}
                  {entries.map((l, i) => (
                    <ReferenceLine key={i} y={l.price} ifOverflow="hidden" stroke={l.color} strokeDasharray="4 4" />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          {macd && view.length > 1 && (
            <div className="h-14 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={plot} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis orientation="right" domain={["auto", "auto"]} hide width={52} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="hist" isAnimationActive={false}>
                    {plot.map((c) => (
                      <Cell key={c.t} fill={(c.hist ?? 0) >= 0 ? UP : DOWN} fillOpacity={0.7} />
                    ))}
                  </Bar>
                  <RLine type="monotone" dataKey="macd" stroke="#38BDF8" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                  <RLine type="monotone" dataKey="sig" stroke="#FACC15" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          {view.length > 1 && view.some((c) => c.v > 0) && (
            <div className="h-12 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={plot} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis orientation="right" domain={[0, "auto"]} hide width={52} />
                  <Bar dataKey="v" isAnimationActive={false}>
                    {plot.map((c) => (
                      <Cell key={c.t} fill={c.c >= c.o ? UP : DOWN} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          {entries.length > 0 && <div className="text-[10px] text-muted-foreground mt-1 text-left">Пунктиром показаны ваши входы</div>}
        </button>
      </div>
      {fr !== 0 && (
        <p className="px-1 -mt-1 text-[10px] leading-snug text-muted-foreground bg-transparent">
          Ставка финансирования {fr > 0 ? "+" : ""}{String(fr).replace(".", ",")}% за 8 ч: {fr > 0 ? "лонги платят шортам" : "шорты платят лонгам"}.
        </p>
      )}

    </>
  );
};

export default MobileChart;
