import func2url from "../../../../backend/func2url.json";

export const INTERVALS = [
  { v: "1m", label: "1м", ms: 60_000 },
  { v: "5m", label: "5м", ms: 300_000 },
  { v: "15m", label: "15м", ms: 900_000 },
  { v: "1h", label: "1ч", ms: 3_600_000 },
  { v: "4h", label: "4ч", ms: 14_400_000 },
  { v: "1d", label: "1д", ms: 86_400_000 },
];

export const fmtVol = (v: number) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toFixed(0));
export const FIRST_VIEW = 120;

export const loadKlines = async (coinId: string, interval: string, token: string | null): Promise<Candle[]> => {
  const r = await fetch(`${func2url.trading}?action=candles&coinId=${coinId}&interval=${interval}`, { headers: { "X-Auth-Token": token ?? "" } });
  if (!r.ok) throw new Error("klines unavailable");
  const data = (await r.json()) as { candles: number[][] };
  return data.candles.map(([t, o, h, l, c, v]) => ({ t, o, h, l, c, v, range: [l, h] as [number, number] }));
};

export interface Candle { empty?: boolean; t: number; o: number; h: number; l: number; c: number; v: number; range: [number, number]; ma20?: number; ma50?: number; bbU?: number; bbL?: number; rsi?: number; macd?: number; sig?: number; hist?: number }
export interface Line { price: number; label: string; color: string }

export const UP = "#22C55E";
export const DOWN = "hsl(var(--down))";

const sma = (c: number[], n: number, i: number) => (i >= n - 1 ? c.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n : undefined);

const ema = (c: number[], n: number): number[] => {
  const k = 2 / (n + 1);
  const out: number[] = [];
  c.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
};

export const withIndicators = (d: Candle[]): Candle[] => {
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

export const INDICATORS = [
  { k: "ma20", label: "MA 20", color: "#FACC15" },
  { k: "ma50", label: "MA 50", color: "#38BDF8" },
  { k: "bb", label: "Боллинджер", color: "#A78BFA" },
  { k: "rsi", label: "RSI 14", color: "#F472B6" },
  { k: "macd", label: "MACD", color: "#FB923C" },
] as const;

export const fromPoints = (pts: { t: number; p: number }[]): Candle[] => {
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

interface ShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Candle;
  background?: { y: number; height: number };
  domain?: [number, number];
}

export const CandleShape = (props: ShapeProps) => {
  const { x = 0, y = 0, width = 0, height = 0, payload, background, domain } = props;
  if (!payload || payload.empty) return null;
  const { o, h, l, c } = payload;
  const color = c >= o ? UP : DOWN;
  let yOf: (v: number) => number;
  if (background && domain && domain[1] > domain[0]) {
    const span = domain[1] - domain[0];
    yOf = (v) => background.y + ((domain[1] - v) / span) * background.height;
  } else {
    const span = h - l || 1;
    yOf = (v) => y + ((h - v) / span) * height;
  }
  const top = yOf(Math.max(o, c));
  const body = Math.max(Math.abs(yOf(o) - yOf(c)), 1);
  const cx = x + width / 2;
  const bw = Math.max(width * 0.7, 2);
  return (
    <g>
      <line x1={cx} x2={cx} y1={yOf(h)} y2={yOf(l)} stroke={color} strokeWidth={1} />
      <rect x={cx - bw / 2} y={top} width={bw} height={body} fill={color} />
    </g>
  );
};
