import { fgColor, useFearGreed } from "@/lib/fearGreed";

const CX = 100;
const CY = 100;
const R = 80;

const point = (v: number, r = R) => {
  const a = Math.PI * (1 - v / 100);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
};

const arc = (from: number, to: number) => {
  const s = point(from);
  const e = point(to);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
};

const SEGMENTS = [
  { from: 0, to: 25, color: "#dc2626" },
  { from: 25, to: 45, color: "#ea580c" },
  { from: 45, to: 55, color: "#f59e0b" },
  { from: 55, to: 75, color: "#f97316" },
  { from: 75, to: 100, color: "#fb923c" },
];

const FearGreedGauge = () => {
  const { data: fg } = useFearGreed();
  const v = fg?.value ?? 50;
  const tip = point(v, 62);

  return (
    <div
      className="h-full flex flex-col items-center justify-center p-3"
      title={`Индекс страха и жадности крипторынка: 0 — паника, 100 — эйфория${fg?.prev != null ? `. Вчера: ${fg.prev}` : ""}`}
    >
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-1">Страх и жадность</div>
      <svg viewBox="0 0 200 118" className="w-full max-w-[220px]" role="img" aria-label="Индекс страха и жадности">
        {SEGMENTS.map((s) => (
          <path key={s.from} d={arc(s.from + 0.6, s.to - 0.6)} stroke={s.color} strokeWidth="16" fill="none" />
        ))}
        {fg && (
          <g>
            <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="white" strokeWidth="3" strokeLinecap="round" />
            <circle cx={CX} cy={CY} r="6" fill="white" />
          </g>
        )}
        <text x="14" y="116" fill="currentColor" className="text-muted-foreground" fontSize="9" textAnchor="middle">0</text>
        <text x="186" y="116" fill="currentColor" className="text-muted-foreground" fontSize="9" textAnchor="middle">100</text>
      </svg>
      {fg ? (
        <div className="flex items-baseline gap-2 -mt-1">
          <span className={`font-mono tabular text-2xl leading-none ${fgColor(fg.value)}`}>{fg.value}</span>
          <span className="text-white text-xs">{fg.label}</span>
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">—</div>
      )}
    </div>
  );
};

export default FearGreedGauge;
