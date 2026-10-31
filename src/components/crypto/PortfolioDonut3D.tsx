import { useState } from "react";

export interface DonutItem {
  id: string;
  label: string;
  value: number;
  color: string;
  valueText: string;
}

const CX = 130;
const CY = 80;
const RX = 112;
const RY = 52;
const INNER = 0.56;
const DEPTH = 22;

const pt = (a: number, k: number) => `${(CX + RX * k * Math.cos(a)).toFixed(2)} ${(CY + RY * k * Math.sin(a)).toFixed(2)}`;

const sector = (a0: number, a1: number) => {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${pt(a0, 1)} A ${RX} ${RY} 0 ${large} 1 ${pt(a1, 1)} L ${pt(a1, INNER)} A ${RX * INNER} ${RY * INNER} 0 ${large} 0 ${pt(a0, INNER)} Z`;
};

const PortfolioDonut3D = ({ items, compact = false }: { items: DonutItem[]; compact?: boolean }) => {
  const [hover, setHover] = useState<string | null>(null);
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return null;

  let acc = -Math.PI / 2;
  const arcs = items.map((i) => {
    const sweep = Math.min((i.value / total) * Math.PI * 2, Math.PI * 2 - 0.0001);
    const a0 = acc;
    acc += (i.value / total) * Math.PI * 2;
    return { ...i, a0, a1: a0 + sweep, pct: (i.value / total) * 100 };
  });

  const layers = Array.from({ length: Math.round(DEPTH / 2) }, (_, n) => DEPTH - n * 2);
  const active = arcs.find((a) => a.id === hover);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative w-full ${compact ? "max-w-[220px]" : "max-w-[320px]"}`}>
        <svg viewBox="0 0 260 178" className="w-full h-auto overflow-visible" role="img" aria-label="Распределение активов">
          <ellipse cx={CX} cy={CY + DEPTH + 8} rx={RX * 0.92} ry={RY * 0.7} fill="#000" opacity="0.35" style={{ filter: "blur(7px)" }} />
          <g style={{ filter: "brightness(0.5)" }}>
            {layers.map((d) => (
              <g key={d} transform={`translate(0 ${d})`}>
                {arcs.map((a) => (
                  <path key={a.id} d={sector(a.a0, a.a1)} fill={a.color} />
                ))}
              </g>
            ))}
          </g>
          {arcs.map((a) => (
            <path
              key={a.id}
              d={sector(a.a0, a.a1)}
              fill={a.color}
              stroke="hsl(var(--card))"
              strokeWidth="1"
              opacity={hover && hover !== a.id ? 0.55 : 1}
              transform={hover === a.id ? "translate(0 -5)" : undefined}
              style={{ transition: "opacity .15s, transform .15s", cursor: "pointer" }}
              onMouseEnter={() => setHover(a.id)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          <ellipse cx={CX} cy={CY - 6} rx={RX * 0.8} ry={RY * 0.42} fill="#fff" opacity="0.07" pointerEvents="none" />
        </svg>
        <div className="absolute inset-x-0 top-[34%] flex flex-col items-center pointer-events-none">
          <span className="font-mono text-lg text-white leading-none">{active ? `${active.pct.toFixed(1).replace(".", ",")}%` : items.length}</span>
          <span className="text-[10px] text-muted-foreground mt-1">{active ? active.label : "активов"}</span>
        </div>
      </div>
      <div className={`grid grid-cols-1 gap-x-4 gap-y-1 w-full text-xs ${compact ? "" : "sm:grid-cols-2"}`}>
        {arcs.map((a) => (
          <div
            key={a.id}
            onMouseEnter={() => setHover(a.id)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors ${hover === a.id ? "bg-hover/60" : ""}`}
          >
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: a.color }} />
            <span className="text-muted-foreground">{a.label}</span>
            <span className="font-mono text-white ml-auto">{a.pct.toFixed(1).replace(".", ",")}%</span>
            {!compact && <span className="font-mono text-muted-foreground w-20 text-right hidden sm:block">{a.valueText}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioDonut3D;
