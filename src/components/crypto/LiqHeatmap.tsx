import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtUsd, Heatmap, useHeatmap } from "@/lib/radars";

const RANGES = [
  ["1d", "24 часа"],
  ["3d", "3 дня"],
  ["7d", "Неделя"],
  ["30d", "Месяц"],
] as const;

const STOPS: [number, [number, number, number]][] = [
  [0, [24, 12, 48]],
  [0.15, [56, 22, 110]],
  [0.35, [22, 102, 160]],
  [0.55, [20, 170, 150]],
  [0.75, [150, 220, 60]],
  [1, [255, 236, 60]],
];

const colorAt = (t: number): [number, number, number] => {
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1];
      const [b, cb] = STOPS[i];
      const k = (t - a) / (b - a);
      return [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k];
    }
  }
  return STOPS[STOPS.length - 1][1];
};

const fmtPrice = (p: number) => `$${Math.round(p).toLocaleString("ru-RU")}`;
const AXIS = 64;
const BOTTOM = 22;

const draw = (cv: HTMLCanvasElement, d: Heatmap, hover: { x: number; y: number } | null) => {
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth;
  const H = cv.clientHeight;
  cv.width = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#120a26";
  ctx.fillRect(0, 0, W, H);

  const pw = W - AXIS;
  const ph = H - BOTTOM;
  const cols = d.matrix.length;
  const rows = d.rows;
  const cw = pw / cols;
  const rh = ph / rows;
  const y = (p: number) => ph - ((p - d.priceMin) / (d.priceMax - d.priceMin)) * ph;

  for (let c = 0; c < cols; c++) {
    const col = d.matrix[c];
    for (let r = 0; r < rows; r++) {
      const v = col[r];
      if (!v) continue;
      const t = Math.pow(v / 1000, 0.55);
      const [R, G, B] = colorAt(t);
      ctx.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`;
      ctx.fillRect(c * cw, ph - (r + 1) * rh, Math.ceil(cw) + 0.5, Math.ceil(rh) + 0.5);
    }
  }

  for (let c = 0; c < cols; c++) {
    const [o, h, l, cl] = d.candles[c];
    const up = cl >= o;
    ctx.strokeStyle = up ? "rgba(52,211,153,0.95)" : "rgba(248,113,113,0.95)";
    ctx.fillStyle = ctx.strokeStyle;
    const x = c * cw + cw / 2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y(h));
    ctx.lineTo(x, y(l));
    ctx.stroke();
    if (cw >= 2.5) {
      const top = y(Math.max(o, cl));
      ctx.fillRect(c * cw + cw * 0.15, top, cw * 0.7, Math.max(1, y(Math.min(o, cl)) - top));
    }
  }

  const py = y(d.price);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.moveTo(0, py);
  ctx.lineTo(pw, py);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#1b1b22";
  ctx.fillRect(pw, 0, AXIS, H);
  ctx.fillRect(0, ph, W, BOTTOM);
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillStyle = "#9ca3af";
  ctx.textBaseline = "middle";
  const ticks = 8;
  for (let i = 0; i <= ticks; i++) {
    const p = d.priceMin + ((d.priceMax - d.priceMin) * i) / ticks;
    const yy = y(p);
    if (yy < 8 || yy > ph - 4) continue;
    ctx.fillText(Math.round(p).toLocaleString("ru-RU"), pw + 6, yy);
  }
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(pw, py - 9, AXIS, 18);
  ctx.fillStyle = "#000";
  ctx.font = "bold 10px ui-monospace, monospace";
  ctx.fillText(Math.round(d.price).toLocaleString("ru-RU"), pw + 6, py);

  ctx.font = "10px ui-monospace, monospace";
  ctx.fillStyle = "#9ca3af";
  ctx.textBaseline = "alphabetic";
  const long = d.range === "30d" || d.range === "7d";
  const labels = 6;
  for (let i = 0; i < labels; i++) {
    const c = Math.round(((cols - 1) * (i + 0.5)) / labels);
    const dt = new Date(d.times[c]);
    const txt = long
      ? dt.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
      : dt.toLocaleString("ru-RU", { day: "numeric", hour: "2-digit", minute: "2-digit" });
    ctx.fillText(txt, Math.max(2, c * cw - 24), H - 7);
  }

  if (hover && hover.x < pw && hover.y < ph) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(hover.x, 0);
    ctx.lineTo(hover.x, ph);
    ctx.moveTo(0, hover.y);
    ctx.lineTo(pw, hover.y);
    ctx.stroke();
  }
};

const LiqHeatmap = ({ symbol }: { symbol: string }) => {
  const [range, setRange] = useState<string>("3d");
  const { data, isLoading, isError, refetch, isFetching } = useHeatmap(symbol, range, true);
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !data) return;
    draw(cv, data, hover);
    const ro = new ResizeObserver(() => draw(cv, data, hover));
    ro.observe(cv);
    return () => ro.disconnect();
  }, [data, hover]);

  let tip: { price: number; usd: number; time: number } | null = null;
  if (hover && data && ref.current) {
    const pw = ref.current.clientWidth - AXIS;
    const ph = ref.current.clientHeight - BOTTOM;
    if (hover.x < pw && hover.y < ph) {
      const c = Math.min(data.matrix.length - 1, Math.floor((hover.x / pw) * data.matrix.length));
      const r = Math.min(data.rows - 1, Math.floor(((ph - hover.y) / ph) * data.rows));
      tip = {
        price: data.priceMin + ((r + 0.5) / data.rows) * (data.priceMax - data.priceMin),
        usd: (data.matrix[c][r] / 1000) * data.peakUsd,
        time: data.times[c],
      };
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-rail rounded-lg p-1">
          {RANGES.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setRange(id)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                range === id ? "bg-hover text-white font-semibold" : "text-muted-foreground hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {data && (
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5">
            {isFetching && <Icon name="Loader2" size={12} className="animate-spin" />}
            {data.source} · обновлено {new Date(data.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="relative rounded-lg overflow-hidden border border-border">
        {isLoading && <Skeleton className="w-full h-[380px] sm:h-[460px] bg-rail" />}
        {isError && (
          <div className="h-[380px] flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            Данные бирж временно недоступны
            <button onClick={() => refetch()} className="text-primary hover:underline">
              Повторить
            </button>
          </div>
        )}
        {data && (
          <>
            <canvas
              ref={ref}
              className="w-full h-[380px] sm:h-[460px] block cursor-crosshair"
              onMouseMove={(e) => {
                const b = e.currentTarget.getBoundingClientRect();
                setHover({ x: e.clientX - b.left, y: e.clientY - b.top });
              }}
              onMouseLeave={() => setHover(null)}
            />
            {tip && hover && (
              <div
                className="absolute pointer-events-none bg-black/85 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white whitespace-nowrap"
                style={{ left: Math.min(hover.x + 12, (ref.current?.clientWidth ?? 0) - 190), top: Math.max(hover.y - 46, 4) }}
              >
                <div>{fmtPrice(tip.price)}</div>
                <div className="text-yellow-300">ликвидации ≈ {fmtUsd(tip.usd)}</div>
                <div className="text-muted-foreground">
                  {new Date(tip.time).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
        <span>мало</span>
        <div
          className="h-2 flex-1 max-w-[220px] rounded-full"
          style={{ background: `linear-gradient(90deg, ${STOPS.map(([s, c]) => `rgb(${c.join(",")}) ${s * 100}%`).join(", ")})` }}
        />
        <span>много ликвидаций</span>
      </div>

      {data && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-rail/60 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Icon name="ArrowUp" size={12} className="text-down" /> Выше цены — ликвидации шортов
            </div>
            {data.above.length ? (
              data.above.map((l) => (
                <div key={l.price} className="flex justify-between text-sm font-mono">
                  <span className="text-white">{fmtPrice(l.price)}</span>
                  <span className="text-yellow-300">{fmtUsd(l.usd)}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">Крупных скоплений нет</div>
            )}
          </div>
          <div className="bg-rail/60 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Icon name="ArrowDown" size={12} className="text-green-400" /> Ниже цены — ликвидации лонгов
            </div>
            {data.below.length ? (
              data.below.map((l) => (
                <div key={l.price} className="flex justify-between text-sm font-mono">
                  <span className="text-white">{fmtPrice(l.price)}</span>
                  <span className="text-yellow-300">{fmtUsd(l.usd)}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">Крупных скоплений нет</div>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Оценочная модель: по росту открытого интереса фьючерсов мы прикидываем, на каких уровнях стоят ликвидации позиций с плечом
        5×–100×. Яркие полосы — зоны, куда цену часто «притягивает». Скопления, которые цена уже прошла, гаснут. Это не
        инвестиционная рекомендация.
      </p>
    </div>
  );
};

export default LiqHeatmap;
