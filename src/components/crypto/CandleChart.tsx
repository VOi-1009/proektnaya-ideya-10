import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, ComposedChart, Line as RLine, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtPrice, useChart } from "@/lib/crypto";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Candle, CandleShape, FIRST_VIEW, INTERVALS, Line, fmtVol, fromPoints, loadKlines, withIndicators } from "./candle/chartUtils";
import ChartToolbar from "./candle/ChartToolbar";
import ChartFooter from "./candle/ChartFooter";
import IndicatorPanes from "./candle/IndicatorPanes";

interface Props { coinId: string; price: number; lines?: Line[]; liqPrice?: number; onQuick?: (side: "long" | "short") => void; quickInfo?: string; quickDisabled?: boolean; closeInfo?: string; closeProfit?: boolean; onCloseAll?: () => void; closeDisabled?: boolean; plotClass?: string }

const CandleChart = ({ coinId, price, lines = [], liqPrice, onQuick, quickInfo, quickDisabled, closeInfo, closeProfit, onCloseAll, closeDisabled, plotClass }: Props) => {
  const { token } = useAuth();
  const [interval, setIntervalV] = useState("1h");
  const days = 7;
  const [on, setOn] = useState<Record<string, boolean>>({ ma20: true, ma50: true, bb: false, rsi: false, macd: false });
  const [view, setView] = useState<{ start: number; size: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [yZoom, setYZoom] = useState(1);
  const [yShift, setYShift] = useState(0);
  const [autoFit, setAutoFit] = useState(false);
  const yDrag = useRef<{ y: number; z: number } | null>(null);
  const drag = useRef<{ x: number; start: number; y: number; shift: number } | null>(null);
  const total = useRef(0);
  const MIN = 10;
  const { data: line } = useChart(coinId, days, price);
  const { data, isLoading } = useQuery<Candle[]>({
    queryKey: ["klines", coinId, interval, line?.length ?? 0, !!token],
    queryFn: async () => {
      try {
        return await loadKlines(coinId, interval, token);
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
    setYZoom(1);
    setYShift(0);
  }, [coinId, interval]);

  const firstLen = data?.length ?? 0;
  useEffect(() => {
    if (firstLen > FIRST_VIEW) setView({ start: firstLen - FIRST_VIEW, size: FIRST_VIEW });
  }, [coinId, interval, firstLen > 0]);

  const clampView = (start: number, size: number, n: number) => {
    const sz = Math.min(Math.max(Math.round(size), Math.min(MIN, n)), n);
    return { start: Math.min(Math.max(Math.round(start), 0), n - Math.ceil(sz * 0.4)), size: sz };
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

  const clampY = (z: number) => Math.min(Math.max(z, 0.3), 12);

  useEffect(() => {
    const el = axisRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setAutoFit(false);
      setYZoom((z) => clampY(z * (e.deltaY > 0 ? 1 / 1.15 : 1.15)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data]);

  const onAxisDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setAutoFit(false);
    yDrag.current = { y: e.clientY, z: yZoom };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onAxisMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!yDrag.current) return;
    setYZoom(clampY(yDrag.current.z * Math.exp((yDrag.current.y - e.clientY) / 120)));
  };
  const onAxisUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    yDrag.current = null;
  };

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, start: view?.start ?? 0, y: e.clientY, shift: yShift };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !boxRef.current) return;
    const n = total.current;
    const cur = view ?? { start: 0, size: n };
    const w = boxRef.current.getBoundingClientRect().width || 1;
    const shift = ((drag.current.x - e.clientX) / w) * cur.size;
    setView(clampView(drag.current.start + shift, cur.size, n));
    const h = plotRef.current?.getBoundingClientRect().height || 1;
    const dy = e.clientY - drag.current.y;
    if (autoFit && Math.abs(dy) > 3) setAutoFit(false);
    if (!autoFit || Math.abs(dy) > 3) setYShift(drag.current.shift + (dy / h) * (domain[1] - domain[0]));
  };
  const onUp = () => {
    drag.current = null;
  };

  const enriched = useMemo(() => (data ? withIndicators(data) : []), [data]);
  const visible = useMemo(() => {
    if (!view) return enriched;
    const part = enriched.slice(view.start, view.start + view.size);
    const missing = view.size - part.length;
    if (missing <= 0 || !enriched.length) return part;
    const lastT = enriched[enriched.length - 1].t;
    const blanks: Candle[] = Array.from({ length: missing }, (_, i) => ({ t: lastT + (i + 1) * ivMs, o: 0, h: 0, l: 0, c: 0, v: 0, range: [0, 0] as [number, number], empty: true }));
    return [...part, ...blanks];
  }, [enriched, view, ivMs]);
  const domain = useMemo<[number, number]>(() => {
    const real = visible.filter((c) => !c.empty);
    if (!real.length) return [0, 1];
    const lo = Math.min(...real.map((c) => c.l));
    const hi = Math.max(...real.map((c) => c.h));
    const pad = (hi - lo) * 0.06 || hi * 0.001;
    if (autoFit) {
      let a = lo;
      let b = hi;
      const range = hi - lo || hi * 0.001;
      if (liqPrice && liqPrice > 0 && liqPrice > lo - range * 3 && liqPrice < hi + range * 3) {
        a = Math.min(a, liqPrice);
        b = Math.max(b, liqPrice);
      }
      const p2 = (b - a) * 0.06 || b * 0.001;
      return [a - p2, b + p2];
    }
    const mid = (hi + lo) / 2 + yShift;
    const half = (hi - lo) / 2 + pad;
    return [mid - half / yZoom, mid + half / yZoom];
  }, [visible, yZoom, yShift, autoFit, liqPrice]);

  const fmtTick = (t: number) => {
    const d = new Date(t);
    return ivMs < 86_400_000 * 1
      ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  return (
    <div className={full ? "fixed inset-0 z-[100] bg-background p-3 sm:p-4 overflow-y-auto flex flex-col" : ""}>
      <ChartToolbar
        coinId={coinId}
        price={price}
        onQuick={onQuick}
        quickInfo={quickInfo}
        quickDisabled={quickDisabled}
        closeInfo={closeInfo}
        closeProfit={closeProfit}
        onCloseAll={onCloseAll}
        closeDisabled={closeDisabled}
        zoom={zoom}
        autoFit={autoFit}
        setAutoFit={setAutoFit}
        resetAll={() => { setView(null); setYZoom(1); setYShift(0); setAutoFit(false); }}
        full={full}
        setFull={setFull}
      />
      <div
        ref={boxRef}
        title="Тяните график в любую сторону: влево-вправо — время, вверх-вниз — цена"
        className="cursor-grab active:cursor-grabbing touch-pan-y select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => { setView(null); setYZoom(1); setYShift(0); setAutoFit(false); }}
      >
        {isLoading || !data ? (
          <Skeleton className={`w-full bg-rail ${plotClass ?? (full ? "h-[60vh]" : "h-[460px] sm:h-[600px]")}`} />
        ) : (
          <>
          <div ref={plotRef} className={`relative ${plotClass ?? (full ? "h-[calc(100vh-190px)] min-h-[320px]" : "h-[460px] sm:h-[600px]")}`}>
          <div
            ref={axisRef}
            title="Тяните вверх и вниз или крутите колесо — растяжение шкалы цены. Двойной клик — сброс"
            className="absolute right-0 top-0 bottom-6 w-[72px] z-10 cursor-ns-resize touch-none group"
            onPointerDown={onAxisDown}
            onPointerMove={onAxisMove}
            onPointerUp={onAxisUp}
            onPointerCancel={onAxisUp}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setAutoFit(false);
              setYZoom(1);
              setYShift(0);
            }}
          >
            <div className="absolute inset-y-0 right-0 w-full rounded bg-white/0 group-hover:bg-white/5 transition-colors" />
            {!autoFit && (yZoom !== 1 || yShift !== 0) && <span className="absolute top-1 right-1 text-[10px] font-mono text-primary">{yZoom !== 1 ? `×${yZoom.toFixed(1)}` : "сдвиг"}</span>}
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visible} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.09} strokeWidth={1} />
              <XAxis dataKey="t" tickFormatter={fmtTick} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={50} />
              <YAxis
                orientation="right"
                domain={domain}
                tickCount={full ? 16 : 11}
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
                  if (!p || p.empty) return null;
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
              <Bar dataKey="range" shape={<CandleShape domain={domain} />} isAnimationActive={false} />
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
          <IndicatorPanes visible={visible} on={on} />
          </>
        )}
      </div>
      <ChartFooter interval={interval} setIntervalV={setIntervalV} on={on} setOn={setOn} />
    </div>
  );
};

export default CandleChart;
