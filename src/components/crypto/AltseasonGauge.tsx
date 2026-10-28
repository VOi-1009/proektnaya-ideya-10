import { altLabel, useCmcMetrics } from "@/lib/cmcMetrics";
import GaugeDial from "./GaugeDial";

const SEGMENTS = [
  { from: 0, to: 25, color: "#f97316" },
  { from: 25, to: 50, color: "#fb923c" },
  { from: 50, to: 75, color: "#a78bfa" },
  { from: 75, to: 100, color: "#8b5cf6" },
];

const AltseasonGauge = () => {
  const { data } = useCmcMetrics();
  const a = data?.altseason;
  const v = a?.value ?? null;
  return (
    <GaugeDial
      title="Индекс альтсезона"
      value={v}
      label={v !== null ? altLabel(v) : undefined}
      valueCls="text-violet-300"
      segments={SEGMENTS}
      href="https://coinmarketcap.com/ru/charts/altcoin-season-index/"
      tooltip={`Индекс альтсезона: 0 — сезон биткоина, 100 — сезон альткоинов${a?.yesterday != null ? `. Вчера: ${a.yesterday}` : ""}`}
    />
  );
};

export default AltseasonGauge;
