import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, ComposedChart, Line as RLine, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtPrice, useChart } from "@/lib/crypto";
import func2url from "../../../backend/func2url.json";
import { Skeleton } from "@/components/ui/skeleton";

const INTERVALS = [
  { v: "1m", label: "1м", ms: 60_000 },
  { v: "5m", label: "5м", ms: 300_000 },
  { v: "15m", label: "15м", ms: 900_000 },
  { v: "1h", label: "1ч", ms: 3_600_000 },
  { v: "4h", label: "4ч", ms: 14_400_000 },
  { v: "1d", label: "1д", ms: 86_400_000 },
];

const fmtVol = (v: number) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toFixed(0));
const FIRST_VIEW = 120;

const loadKlines = async (coinId: string, interval: string): Promise<Candle[]> => {
  const r = await fetch(`${func2url.trading}?action=candles&coinId=${coinId}&interval=${interval}`);
  if (!r.ok) throw new Error("klines unavailable");
  const data = (await r.json()) as { candles: number[][] };
  return data.candles.map(([t, o, h, l, c, v]) => ({ t, o, h, l, c, v, range: [l, h] as [number, number] }));
};

interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; range: [number, number]; ma20?: number; ma50?: number; bbU?: number; bbL?: number; rsi?: number; macd?: number; sig?: number; hist?: number }
interface Line { price: number; label: string; color: string }

const UP = "#22C55E";
const DOWN = "hsl(var(--down))";

const sma = (c: number[], n: number, i: number) => (i >= n - 1 ? c.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n : undefined);

const ema = (c: number[], n: number): number[] => {
  const k = 2 / (n + 1);
  const out: number[] = [];
  c.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
};

const withIndicators = (d: Candle[]): Candle[] => {
  const c = d.map((x) => x.c);
  const e12 = ema(c, 12);
  const e26 = ema(c, 26);
  const macdLine = c.map((_, i) => e12[i] - e26[i]);
  const sigLine = ema(macdLine, 9);
  let ag = 0;
  let al = 0;
  return d.map((x, i) => {
    const ma20 = sma(c, 20, i);
    const ma50 = sma(c, 50, i);
    let bbU: number | undefined;
    let bbL: number | undefined;
    if (ma20 !== undefined) {
      const sd = Math.sqrt(c.slice(i - 19, i + 1).reduce((a, b) => a + (b - ma20) ** 2, 0) / 20);
      bbU = ma20 + 2 * sd;
      bbL = ma20 - 2 * sd;
    }
    let rsi: number | undefined;
    if (i >= 1) {
      const ch = c[i] - c[i - 1];
      const g = Math.max(ch, 0);
      const l = Math.max(-ch, 0);
      if (i <= 14) {
        ag += g / 14;
        al += l / 14;
      } else {
        ag = (ag * 13 + g) / 14;
        al = (al * 13 + l) / 14;
      }
      if (i >= 14) rsi = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    const ok = i >= 33;
    return { ...x, ma20, ma50, bbU, bbL, rsi, macd: ok ? macdLine[i] : undefined, sig: ok ? sigLine[i] : undefined, hist: ok ? macdLine[i] - sigLine[i] : undefined };
  });
};

const INDICATORS = [
  { k: "ma20", label: "MA 20", color: "#FACC15" },
  { k: "ma50", label: "MA 50", color: "#38BDF8" },
  { k: "bb", label: "Боллинджер", color: "#A78BFA" },
  { k: "rsi", label: "RSI 14", color: "#F472B6" },
  { k: "macd", label: "MACD", color: "#FB923C" },
] as const;

const fromPoints = (pts: { t: number; p: number }[]): Candle[] => {
  const size = Math.max(2, Math.floor(pts.length / 60));
  const out: Candle[] = [];
  for (let i = 0; i < pts.length; i += size) {
    const g = pts.slice(i, i + size);
    const ps = g.map((x) => x.p);
    const h = Math.max(...ps);
    const l = Math.min(...ps);
    out.push({ t: g[0].t, o: ps[0], h, l, c: ps[ps.length - 1], v: 0, range: [l, h] });
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

interface Props { coinId: string; price: number; lines?: Line[]; onQuick?: (side: "long" | "short") => void; quickInfo?: string; quickDisabled?: boolean; closeInfo?: string; closeProfit?: boolean; onCloseAll?: () => void; closeDisabled?: boolean }

const CandleChart = ({ coinId, price, lines = [], onQuick, quickInfo, quickDisabled, closeInfo, closeProfit, onCloseAll, closeDisabled }: Props) => {
  const [interval, setIntervalV] = useState("1h");
  const days = 7;
  const [on, setOn] = useState<Record<string, boolean>>({ ma20: true, ma50: true, bb: false, rsi: false, macd: false });
  const [view, setView] = useState<{ start: number; size: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const total = useRef(0);
  const MIN = 10;
  const { data: line } = useChart(coinId, days, price);
  const { data, isLoading } = useQuery<Candle[]>({
    queryKey: ["klines", coinId, interval, line?.length ?? 0],
    queryFn: async () => {
      try {
        return await loadKlines(coinId, interval);
      } catch {
        return fromPoints(line ?? []);
      }
    },
    enabled: !!line,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const ivMs = INTERVALS.find((i) => i.v === interval)?.ms ?? 3_600_000;

  total.current = data?.length ?? 0;

  useEffect(() => {
    setView(null);
  }, [coinId, interval]);

  const firstLen = data?.length ?? 0;
  useEffect(() => {
    if (firstLen > FIRST_VIEW) setView({ start: firstLen - FIRST_VIEW, size: FIRST_VIEW });
  }, [coinId, interval, firstLen > 0]);

  const clampView = (start: number, size: number, n: number) => {
    const sz = Math.min(Math.max(Math.round(size), Math.min(MIN, n)), n);
    return { start: Math.min(Math.max(Math.round(start), 0), n - sz), size: sz };
  };

  const zoom = (factor: number, ratio = 0.5) =>
    setView((v) => {
      const n = total.current;
      if (!n) return v;
      const cur = v ?? { start: 0, size: n };
      const size = cur.size * factor;
      return clampView(cur.start + (cur.size - size) * ratio, size, n);
    });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data]);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, start: view?.start ?? 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !boxRef.current) return;
    const n = total.current;
    const cur = view ?? { start: 0, size: n };
    const w = boxRef.current.getBoundingClientRect().width || 1;
    const shift = ((drag.current.x - e.clientX) / w) * cur.size;
    setView(clampView(drag.current.start + shift, cur.size, n));
  };
  const onUp = () => {
    drag.current = null;
  };

  const enriched = useMemo(() => (data ? withIndicators(data) : []), [data]);
  const visible = useMemo(() => (view ? enriched.slice(view.start, view.start + view.size) : enriched), [enriched, view]);
  const domain = useMemo<[number, number]>(() => {
    if (!visible.length) return [0, 1];
    const lo = Math.min(...visible.map((c) => c.l));
    const hi = Math.max(...visible.map((c) => c.h));
    const pad = (hi - lo) * 0.06 || hi * 0.001;
    return [lo - pad, hi + pad];
  }, [visible]);

  const fmtTick = (t: number) => {
    const d = new Date(t);
    return ivMs < 86_400_000 * 1
      ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display text-white">График</h3>
          <span className="font-mono text-white text-sm">{price ? fmtPrice(price, coinId) : "—"}</span>
          {onQuick && (
            <>
              <button disabled={quickDisabled} onClick={() => onQuick("long")} className="px-3 py-1 text-xs font-medium rounded bg-[#22C55E] text-black hover:bg-[#22C55E]/90 disabled:opacity-50">Лонг</button>
              <button disabled={quickDisabled} onClick={() => onQuick("short")} className="px-3 py-1 text-xs font-medium rounded bg-[#EA3943] text-white hover:bg-[#EA3943]/90 disabled:opacity-50">Шорт</button>
              {quickInfo && <span className="text-xs text-muted-foreground">{quickInfo}</span>}
              {onCloseAll && closeInfo && (
                <button disabled={closeDisabled} onClick={onCloseAll} className="px-3 py-1 text-xs font-medium rounded border border-border text-white hover:bg-hover disabled:opacity-50">
                  Закрыть позицию <span className={closeProfit ? "text-[#22C55E]" : "text-[#EA3943]"}>{closeInfo}</span>
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
        <div className="flex bg-rail rounded p-0.5">
          <button onClick={() => zoom(1 / 1.5)} title="Приблизить" className="px-2 py-1 text-muted-foreground hover:text-white"><Icon name="ZoomIn" size={14} /></button>
          <button onClick={() => zoom(1.5)} title="Отдалить" className="px-2 py-1 text-muted-foreground hover:text-white"><Icon name="ZoomOut" size={14} /></button>
          <button onClick={() => setView(null)} title="Весь график" className="px-2 py-1 text-muted-foreground hover:text-white"><Icon name="Maximize" size={14} /></button>
        </div>
        </div>
      </div>
      <div
        ref={boxRef}
        className="cursor-grab active:cursor-grabbing touch-pan-y select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => setView(null)}
      >
        {isLoading || !data ? (
          <Skeleton className="w-full h-[380px] bg-rail" />
        ) : (
          <>
          <div className="h-[300px] sm:h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visible} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
              <XAxis dataKey="t" tickFormatter={fmtTick} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={50} />
              <YAxis
                orientation="right"
                domain={domain}
                allowDataOverflow
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
                      {p.v > 0 && <div>Объём {fmtVol(p.v)}</div>}
                      {on.ma20 && p.ma20 !== undefined && <div style={{ color: "#FACC15" }}>MA 20 {fmtPrice(p.ma20, coinId)}</div>}
                      {on.ma50 && p.ma50 !== undefined && <div style={{ color: "#38BDF8" }}>MA 50 {fmtPrice(p.ma50, coinId)}</div>}
                      {on.macd && p.macd !== undefined && <div style={{ color: "#FB923C" }}>MACD {p.macd.toPrecision(3)} / сигнал {(p.sig ?? 0).toPrecision(3)}</div>}
                      {on.rsi && p.rsi !== undefined && <div style={{ color: "#F472B6" }}>RSI {p.rsi.toFixed(1)}</div>}
                    </div>
                  );
                }}
              />
              <Bar dataKey="range" shape={<CandleShape />} isAnimationActive={false} />
              {on.bb && <RLine type="monotone" dataKey="bbU" stroke="#A78BFA" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} activeDot={false} />}
              {on.bb && <RLine type="monotone" dataKey="bbL" stroke="#A78BFA" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} activeDot={false} />}
              {on.ma20 && <RLine type="monotone" dataKey="ma20" stroke="#FACC15" strokeWidth={1.5} dot={false} isAnimationActive={false} activeDot={false} />}
              {on.ma50 && <RLine type="monotone" dataKey="ma50" stroke="#38BDF8" strokeWidth={1.5} dot={false} isAnimationActive={false} activeDot={false} />}
              {lines.map((l, i) => (
                <ReferenceLine key={i} y={l.price} ifOverflow="hidden" stroke={l.color} strokeDasharray="4 4" label={{ value: l.label, fill: l.color, fontSize: 10, position: "insideTopLeft" }} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
          </div>
          {visible.some((c) => c.v > 0) && (
            <div className="h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visible} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis orientation="right" tickFormatter={fmtVol} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={72} tickCount={3} />
                  <Bar dataKey="v" isAnimationActive={false}>
                    {visible.map((c) => (
                      <Cell key={c.t} fill={c.c >= c.o ? UP : DOWN} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {on.rsi && (
            <div className="h-[90px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visible} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis orientation="right" domain={[0, 100]} ticks={[30, 70]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                  <ReferenceLine y={70} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <RLine type="monotone" dataKey="rsi" stroke="#F472B6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {on.macd && (
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={visible} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis orientation="right" domain={["auto", "auto"]} tickFormatter={(v: number) => (Math.abs(v) >= 1 ? v.toFixed(1) : v.toPrecision(2))} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={72} tickCount={3} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="hist" isAnimationActive={false}>
                    {visible.map((c) => (
                      <Cell key={c.t} fill={(c.hist ?? 0) >= 0 ? UP : DOWN} fillOpacity={0.7} />
                    ))}
                  </Bar>
                  <RLine type="monotone" dataKey="macd" stroke="#38BDF8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <RLine type="monotone" dataKey="sig" stroke="#FACC15" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
      <div className="flex bg-rail rounded p-0.5 w-fit">
        {INTERVALS.map((r) => (
          <button
            key={r.v}
            onClick={() => setIntervalV(r.v)}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              interval === r.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex bg-rail rounded p-0.5 w-fit">
        {INDICATORS.map((ind) => (
          <button
            key={ind.k}
            onClick={() => setOn((o) => ({ ...o, [ind.k]: !o[ind.k] }))}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${on[ind.k] ? "bg-hover text-white" : "text-muted-foreground hover:text-white"}`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: on[ind.k] ? ind.color : "transparent", border: `1px solid ${ind.color}` }} />
            {ind.label}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
};

export default CandleChart;
