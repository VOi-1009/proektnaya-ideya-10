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
      className={`${cardCls("border-violet-400", true)} relative`}
      title={`Индекс альтсезона: 0 — сезон биткоина, 100 — сезон альткоинов${a?.yesterday != null ? `. Вчера: ${a.yesterday}` : ""}`}
    >
      <div className={labelCls}>Индекс альтсезона</div>
      <div className={valueCls}>
        {av !== null ? (
          <>
            {av}
            <span className="ml-1.5 text-[10px] text-violet-300">{altLabel(av)}</span>
          </>
        ) : (
          "—"
        )}
      </div>
      {av !== null && (
        <div className="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-orange-400 via-slate-400 to-violet-400">
          <span
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border border-background"
            style={{ left: `${av}%` }}
          />
        </div>
      )}
    </a>
  );
};

export default AltseasonCard;
