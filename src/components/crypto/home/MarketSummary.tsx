import { Coin, COIN_META, fmtBig, fmtPct } from "@/lib/crypto";
import MarketMetricsRow from "../MarketMetricsRow";
import ExchangeOutflowCard from "../ExchangeOutflowCard";
import QuoteBlock from "../QuoteBlock";
import { cardCls, labelCls, valueCls } from "../summaryCard";

interface Props {
  coins: Coin[];
  go: (channel: string, coinId?: string) => void;
  cols?: 2 | 3;
}

const MarketSummary = ({ coins, go, cols = 3 }: Props) => {
  const cryptos = coins.filter((c) => !c.kind);
  const totalCap = cryptos.reduce((s, c) => s + c.market_cap, 0);
  const sorted = [...cryptos].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const totalVolume = cryptos.reduce((s, c) => s + c.total_volume, 0);
  const best7d = cryptos
    .filter((c) => typeof c.price_change_percentage_7d_in_currency === "number")
    .sort((a, b) => (b.price_change_percentage_7d_in_currency ?? 0) - (a.price_change_percentage_7d_in_currency ?? 0))[0];

  return (
    <>
      <div className={`flex-1 grid ${cols === 2 ? "grid-cols-2" : "grid-cols-3"} gap-2 content-start`}>
        <div className={cardCls("border-metric-gold")}>
          <div className={labelCls}>Капитализация крипто</div>
          <div className={valueCls}>{fmtBig(totalCap)}</div>
        </div>
        {best && (
          <button onClick={() => go("market", best.id)} className={cardCls("border-metric-lime", true)}>
            <div className={labelCls}>Сильнее рынка</div>
            <div className={valueCls}>
              {COIN_META[best.id]?.short} <span className={best.price_change_percentage_24h >= 0 ? "text-up" : "text-down"}>{fmtPct(best.price_change_percentage_24h)}</span>
            </div>
          </button>
        )}
        {worst && (
          <button onClick={() => go("market", worst.id)} className={cardCls("border-metric-magenta", true)}>
            <div className={labelCls}>Аутсайдер</div>
            <div className={valueCls}>
              {COIN_META[worst.id]?.short} <span className="text-down">{fmtPct(worst.price_change_percentage_24h)}</span>
            </div>
          </button>
        )}
        <div className={cardCls("border-metric-teal")}>
          <div className={labelCls}>Объём торгов за 24ч</div>
          <div className={valueCls}>{fmtBig(totalVolume)}</div>
        </div>
        {best7d ? (
          <button onClick={() => go("market", best7d.id)} className={cardCls("border-metric-pink", true)}>
            <div className={labelCls}>Лучший за 7 дней</div>
            <div className={valueCls}>
              {COIN_META[best7d.id]?.short} <span className={(best7d.price_change_percentage_7d_in_currency ?? 0) >= 0 ? "text-up" : "text-down"}>{fmtPct(best7d.price_change_percentage_7d_in_currency)}</span>
            </div>
          </button>
        ) : (
          <div className={cardCls("border-metric-pink")}>
            <div className={labelCls}>Лучший за 7 дней</div>
            <div className={valueCls}>—</div>
          </div>
        )}
        <MarketMetricsRow flat />
        <div className="bg-hover rounded-lg border-l-4 border-metric-sky h-[48px] min-w-0 overflow-hidden">
          <ExchangeOutflowCard go={go} />
        </div>
      </div>
      <div className="flex-1 min-h-[100px] flex flex-col items-center justify-center">
        <QuoteBlock />
      </div>
    </>
  );
};

export default MarketSummary;
