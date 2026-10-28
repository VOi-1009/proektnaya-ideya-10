import { fgColor, useFearGreed } from "@/lib/fearGreed";
import GaugeDial from "./GaugeDial";

const SEGMENTS = [
  { from: 0, to: 25, color: "#dc2626" },
  { from: 25, to: 45, color: "#ea580c" },
  { from: 45, to: 55, color: "#f59e0b" },
  { from: 55, to: 75, color: "#f97316" },
  { from: 75, to: 100, color: "#fb923c" },
];

const FearGreedGauge = () => {
  const { data: fg } = useFearGreed();
  return (
    <GaugeDial
      title="Страх и жадность"
      value={fg?.value ?? null}
      label={fg?.label}
      valueCls={fg ? fgColor(fg.value) : undefined}
      segments={SEGMENTS}
      tooltip={`Индекс страха и жадности крипторынка: 0 — паника, 100 — эйфория${fg?.prev != null ? `. Вчера: ${fg.prev}` : ""}`}
    />
  );
};

export default FearGreedGauge;
