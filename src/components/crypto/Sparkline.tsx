interface Props {
  data: number[];
  up: boolean;
  width?: number;
  height?: number;
}

const Sparkline = ({ data, up, width = 110, height = 32 }: Props) => {
  if (!data?.length) return null;
  const step = Math.max(1, Math.floor(data.length / 50));
  const pts = data.filter((_, i) => i % step === 0);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const coords = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = up ? "hsl(var(--up))" : "hsl(var(--down))";
  const id = `sg-${up ? "u" : "d"}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${coords.join(" ")} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={coords.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

export default Sparkline;
