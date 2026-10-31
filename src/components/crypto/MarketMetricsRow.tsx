import { useCmcMetrics } from "@/lib/cmcMetrics";
import { cardCls, labelCls, valueCls } from "./summaryCard";

const fmtInt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const fmtUsd = (v?: number | null) =>
  v == null ? "—" : v >= 1e9 ? `$${(v / 1e9).toFixed(2).replace(".", ",")} млрд` : `$${(v / 1e6).toFixed(1).replace(".", ",")} млн`;

const LIQ_URL = "https://coinmarketcap.com/ru/charts/liquidations/";

const MarketMetricsRow = ({ cols = "grid-cols-2", flat }: { cols?: string; flat?: boolean }) => {
  const { data } = useCmcMetrics();
  const l = data?.liquidations;
  const share = (v?: number | null) => (l?.total && v != null ? Math.round((v / l.total) * 100) : null);
  const longPct = share(l?.longs);
  const shortPct = share(l?.shorts);

  return (
    <div className={flat ? "contents" : `grid ${cols} gap-2 mt-2`}>
      <a
        href={LIQ_URL}
        target="_blank"
        rel="noreferrer"
        className={cardCls("border-metric-sky", true)}
        title="Общий объём ликвидаций на фьючерсных биржах за последние 24 часа"
      >
        <div className={labelCls}>Объем ликвидаций 24h</div>
        <div className={valueCls}>
          {fmtUsd(l?.total)}
          {l?.change24h != null && (
            <span className={`ml-1.5 text-[10px] ${l.change24h >= 0 ? "text-up" : "text-down"}`}>
              {l.change24h >= 0 ? "+" : ""}
              {l.change24h.toFixed(1).replace(".", ",")}%
            </span>
          )}
        </div>
      </a>

      <a href={LIQ_URL} target="_blank" rel="noreferrer" className={cardCls("border-metric-long", true)} title="Ликвидировано длинных позиций (лонгов) за 24 часа">
        <div className={labelCls}>Лонг</div>
        <div className={valueCls}>
          {fmtUsd(l?.longs)}
          {longPct !== null && <span className="ml-1.5 text-[10px] text-metric-long">{longPct}%</span>}
        </div>
      </a>

      <a href={LIQ_URL} target="_blank" rel="noreferrer" className={cardCls("border-metric-short", true)} title="Ликвидировано коротких позиций (шортов) за 24 часа">
        <div className={labelCls}>Шорт</div>
        <div className={valueCls}>
          {fmtUsd(l?.shorts)}
          {shortPct !== null && <span className="ml-1.5 text-[10px] text-metric-short">{shortPct}%</span>}
        </div>
      </a>
    </div>
  );
};

export default MarketMetricsRow;