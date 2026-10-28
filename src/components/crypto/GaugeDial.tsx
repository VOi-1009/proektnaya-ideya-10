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

export interface GaugeSegment {
  from: number;
  to: number;
  color: string;
}

interface Props {
  title: string;
  value: number | null;
  label?: string;
  valueCls?: string;
  segments: GaugeSegment[];
  tooltip?: string;
  href?: string;
}

const GaugeDial = ({ title, value, label, valueCls = "text-white", segments, tooltip, href }: Props) => {
  const tip = point(value ?? 50, 62);
  const body = (
    <div className="h-full flex flex-col items-center justify-center p-3" title={tooltip}>
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-1 text-center">{title}</div>
      <svg viewBox="0 0 200 118" className="w-full max-w-[200px]" role="img" aria-label={title}>
        {segments.map((s) => (
          <path key={s.from} d={arc(s.from + 0.6, s.to - 0.6)} stroke={s.color} strokeWidth="16" fill="none" />
        ))}
        {value !== null && (
          <g>
            <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="white" strokeWidth="3" strokeLinecap="round" />
            <circle cx={CX} cy={CY} r="6" fill="white" />
          </g>
        )}
        <text x="14" y="116" fill="currentColor" className="text-muted-foreground" fontSize="9" textAnchor="middle">0</text>
        <text x="186" y="116" fill="currentColor" className="text-muted-foreground" fontSize="9" textAnchor="middle">100</text>
      </svg>
      {value !== null ? (
        <div className="flex flex-col items-center text-center -mt-1">
          <span className={`font-mono tabular text-2xl leading-none ${valueCls}`}>{value}</span>
          {label && <span className="text-white text-xs mt-1">{label}</span>}
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">—</div>
      )}
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block h-full hover:brightness-110 transition-all">
      {body}
    </a>
  ) : (
    body
  );
};

export default GaugeDial;
