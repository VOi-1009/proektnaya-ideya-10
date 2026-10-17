import { altLabel, useCmcMetrics } from "@/lib/cmcMetrics";
import { cardCls, labelCls, valueCls } from "./summaryCard";

const fmtInt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const fmtUsd = (v?: number | null) =>
  v == null ? "—" : v >= 1e9 ? `$${(v / 1e9).toFixed(2).replace(".", ",")} млрд` : `$${(v / 1e6).toFixed(1).replace(".", ",")} млн`;

const LIQ_URL = "https://coinmarketcap.com/ru/charts/liquidations/";

const MarketMetricsRow = () => {
  const { data } = useCmcMetrics();
  const t = data?.treasuries;
  const a = data?.altseason;
  const l = data?.liquidations;
  const av = a?.value ?? null;
  const share = (v?: number | null) => (l?.total && v != null ? Math.round((v / l.total) * 100) : null);
  const longPct = share(l?.longs);
  const shortPct = share(l?.shorts);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 mt-2">
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
