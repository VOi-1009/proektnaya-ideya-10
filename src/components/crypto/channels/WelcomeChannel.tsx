import { Coin, COIN_META, fmtBig, fmtPct } from "@/lib/crypto";
import LatestArticles from "../LatestArticles";
import HomeBlocks from "../HomeBlocks";
import TopNewsBlock from "../TopNewsBlock";
import BtcLiveChart from "../BtcLiveChart";
import MarketMetricsRow from "../MarketMetricsRow";
import QuoteBlock from "../QuoteBlock";
import FearGreedGauge from "../FearGreedGauge";
import AltseasonCard from "../AltseasonCard";
import UpcomingEvents from "../UpcomingEvents";
import HeroSiteNews from "../HeroSiteNews";
import { cardCls, labelCls, valueCls } from "../summaryCard";

interface Props {
  coins: Coin[];
  go: (channel: string, coinId?: string) => void;
  openArticle: (id: number) => void;
}

const WelcomeChannel = ({ coins, go, openArticle }: Props) => {
  const cryptos = coins.filter((c) => !c.kind);
  const totalCap = cryptos.reduce((s, c) => s + c.market_cap, 0);
  const btc = cryptos.find((c) => c.id === "bitcoin");
  const dominance = btc ? (btc.market_cap / totalCap) * 100 : 0;
  const sorted = [...cryptos].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-[18fr_32fr_32fr_18fr] gap-3 animate-scale-in">
        <div className="p-2 sm:p-3 rounded-xl border border-border bg-card min-w-0 lg:order-2">
          <div className="grid grid-cols-2 gap-2">
            <div className={cardCls("border-primary")}>
              <div className={labelCls}>Капитализация крипто</div>
              <div className={valueCls}>{fmtBig(totalCap)}</div>
            </div>
            <div className={cardCls("border-accent")}>
              <div className={labelCls}>Доминация BTC</div>
              <div className={valueCls}>{dominance.toFixed(1).replace(".", ",")}%</div>
            </div>
            {best && (
              <button onClick={() => go("market", best.id)} className={cardCls("border-up", true)}>
                <div className={labelCls}>Сильнее рынка</div>
                <div className={valueCls}>
                  {COIN_META[best.id]?.short} <span className={best.price_change_percentage_24h >= 0 ? "text-up" : "text-down"}>{fmtPct(best.price_change_percentage_24h)}</span>
                </div>
              </button>
            )}
            {worst && (
              <button onClick={() => go("market", worst.id)} className={cardCls("border-down", true)}>
                <div className={labelCls}>Аутсайдер</div>
                <div className={valueCls}>
                  {COIN_META[worst.id]?.short} <span className="text-down">{fmtPct(worst.price_change_percentage_24h)}</span>
                </div>
              </button>
            )}
          </div>
          <MarketMetricsRow />
          <QuoteBlock />
        </div>
        <div className="rounded-xl border border-border bg-card min-h-[120px] lg:order-1 flex flex-col divide-y divide-transparent">
          <div className="flex-1">
            <FearGreedGauge />
          </div>
          <div className="p-3">
            <AltseasonCard />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card min-h-[120px] lg:order-3 overflow-hidden">
          <BtcLiveChart onOpen={() => go("market", "bitcoin")} />
        </div>
        <div className="rounded-xl border border-border bg-card min-h-[120px] lg:order-4 overflow-hidden">
          <UpcomingEvents onAll={() => go("calendar")} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 rounded-xl overflow-hidden border border-border animate-scale-in bg-card">
        <div className="contents">
          <div className="min-h-[200px]" />
          <div className="border-t lg:border-t-0 lg:border-l border-transparent min-h-[200px]" />
          <div className="border-t lg:border-t-0 lg:border-l border-transparent min-h-[200px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 rounded-xl overflow-hidden border border-border bg-card animate-fade-in">
        <TopNewsBlock onAll={() => go("news")} />
        <div className="border-t lg:border-t-0 lg:border-l border-border min-h-[240px]" />
        <div className="border-t lg:border-t-0 lg:border-l border-border min-h-[240px]">
          <HeroSiteNews />
        </div>
      </div>

      <LatestArticles onOpen={openArticle} onAll={() => go("articles")} />

      <HomeBlocks />



      <p className="text-xs text-muted-foreground/70 pb-2">
        Информация на сайте не является инвестиционной рекомендацией. Торговля криптовалютой связана с высоким риском.
      </p>
    </div>
  );
};

export default WelcomeChannel;