import { useCmcMetrics } from "@/lib/cmcMetrics";
import { cardCls, labelCls, valueCls } from "./summaryCard";

const fmtInt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const fmtUsd = (v?: number | null) =>
  v == null ? "—" : v >= 1e9 ? `$${(v / 1e9).toFixed(2).replace(".", ",")} млрд` : `$${(v / 1e6).toFixed(1).replace(".", ",")} млн`;

const LIQ_URL = "https://coinmarketcap.com/ru/charts/liquidations/";

const MarketMetricsRow = ({ cols = "grid-cols-2" }: { cols?: string }) => {
  const { data } = useCmcMetrics();
  const t = data?.treasuries;
  const l = data?.liquidations;
  const share = (v?: number | null) => (l?.total && v != null ? Math.round((v / l.total) * 100) : null);
  const longPct = share(l?.longs);
  const shortPct = share(l?.shorts);

  return (
    <div className={`grid ${cols} gap-2 mt-2`}>
      <a
        href="https://coinmarketcap.com/ru/charts/bitcoin-treasuries/"
        target="_blank"
        rel="noreferrer"
        className={cardCls("border-amber-400", true)}
        title={
          t
            ? `Общее количество удерживаемых Bitcoin: ${fmtInt(t.total)} BTC у ${t.companies} компаний${
                t.top ? `. Крупнейший держатель — ${t.top.name}: ${fmtInt(t.top.holdings)} BTC` : ""
              }`
            : "Общее количество удерживаемых Bitcoin"
        }
      >
        <div className={labelCls}>Общее количество удерживаемых Bitcoin</div>
        <div className={valueCls}>{t ? `${fmtInt(t.total)} BTC` : "—"}</div>
      </a>

      <a
        href={LIQ_URL}
        target="_blank"
        rel="noreferrer"
        className={cardCls("border-sky-400", true)}
        title="Общий объём ликвидаций на фьючерсных биржах за последние 24 часа"
      >
        <div className={labelCls}>Общий объем ликвидаций (24h)</div>
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

      <a href={LIQ_URL} target="_blank" rel="noreferrer" className={cardCls("border-green-500", true)} title="Ликвидировано длинных позиций (лонгов) за 24 часа">
        <div className={labelCls}>Лонг</div>
        <div className={valueCls}>
          {fmtUsd(l?.longs)}
          {longPct !== null && <span className="ml-1.5 text-[10px] text-green-400">{longPct}%</span>}
        </div>
      </a>

      <a href={LIQ_URL} target="_blank" rel="noreferrer" className={cardCls("border-red-500", true)} title="Ликвидировано коротких позиций (шортов) за 24 часа">
        <div className={labelCls}>Шорт</div>
        <div className={valueCls}>
          {fmtUsd(l?.shorts)}
          {shortPct !== null && <span className="ml-1.5 text-[10px] text-red-400">{shortPct}%</span>}
        </div>
      </a>
    </div>
  );
};

export default MarketMetricsRow;