import { altLabel, useCmcMetrics } from "@/lib/cmcMetrics";
import { cardCls, labelCls, valueCls } from "./summaryCard";

const AltseasonCard = () => {
  const { data } = useCmcMetrics();
  const a = data?.altseason;
  const av = a?.value ?? null;
  return (
    <a
      href="https://coinmarketcap.com/ru/charts/altcoin-season-index/"
      target="_blank"
      rel="noreferrer"
      className={cardCls("border-violet-400", true)}
      title={`Индекс альтсезона: 0 — сезон биткоина, 100 — сезон альткоинов${a?.yesterday != null ? `. Вчера: ${a.yesterday}` : ""}`}
    >
      <div className={labelCls}>Индекс альтсезона</div>
      {av !== null ? (
        <>
          <div className="flex items-baseline gap-1.5 mt-0.5 w-full min-w-0">
            <span className="font-mono tabular text-sm leading-tight text-violet-300">{av}</span>
            <span className="text-white text-[10px] truncate">{altLabel(av)}</span>
          </div>
          <div className="relative h-1 rounded-full mt-1 w-full bg-gradient-to-r from-orange-400 via-slate-400 to-violet-400">
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border border-background"
              style={{ left: `${av}%` }}
            />
          </div>
        </>
      ) : (
        <div className={valueCls}>—</div>
      )}
    </a>
  );
};

export default AltseasonCard;
