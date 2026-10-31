import { Coin, COIN_META, fmtBig, fmtPct } from "@/lib/crypto";
import LatestArticles from "../LatestArticles";
import HomeBlocks from "../HomeBlocks";
import TopNewsBlock from "../TopNewsBlock";
import BtcLiveChart from "../BtcLiveChart";
import MarketMetricsRow from "../MarketMetricsRow";
import QuoteBlock from "../QuoteBlock";
import FearGreedGauge from "../FearGreedGauge";
import AltseasonGauge from "../AltseasonGauge";
import ExchangeOutflowCard from "../ExchangeOutflowCard";
import UpcomingEvents from "../UpcomingEvents";
import LiqBars from "../LiqBars";
import EtfNetFlow from "../EtfNetFlow";
import SocialSentiment from "../SocialSentiment";
import PuellStatus from "../PuellStatus";
import BtcHoldings from "../BtcHoldings";
import LiqInsights from "../LiqInsights";
import { Link } from "@/lib/router-compat";
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
  const totalVolume = cryptos.reduce((s, c) => s + c.total_volume, 0);
  const best7d = cryptos
    .filter((c) => typeof c.price_change_percentage_7d_in_currency === "number")
    .sort((a, b) => (b.price_change_percentage_7d_in_currency ?? 0) - (a.price_change_percentage_7d_in_currency ?? 0))[0];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-[18fr_32fr_32fr_18fr] gap-3 animate-scale-in">
        <div className="p-2 sm:p-3 rounded-xl border border-border bg-card min-w-0 lg:order-2 flex flex-col gap-2">
          <div className="flex-1 grid grid-cols-3 gap-2 content-start">
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
        </div>
        <div className="rounded-xl border border-border bg-card min-h-[120px] lg:order-1 flex flex-col divide-y divide-transparent">
          <div className="flex-1 grid grid-cols-2">
            <FearGreedGauge compact />
            <AltseasonGauge compact />
          </div>
          <div className="p-3 flex justify-center">
            <button
              onClick={() => go("trading")}
              className="flex items-center justify-center gap-3 rounded-xl bg-primary text-primary-foreground px-6 py-3 shadow-lg shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition"
            >
              <span className="w-9 h-9 rounded-lg bg-background text-primary flex items-center justify-center font-display font-black text-xl leading-none">
                Т
              </span>
              <span className="font-display font-black text-xl tracking-widest">TRADE</span>
            </button>
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
          <TopNewsBlock onAll={() => go("news")} />
          <div className="border-t lg:border-t-0 lg:border-l border-transparent flex flex-col">
            <div className="flex-1 min-h-[100px] flex flex-col items-center justify-center">
              <QuoteBlock />
            </div>
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-transparent flex flex-col">
            <div className="flex-1 min-h-[100px]">
              <LiqInsights symbol="BTCUSDT" />
            </div>
            <div className="flex-1 min-h-[160px] p-2">
              <LiqBars symbol="BTCUSDT" range="30d" lev="all" mini />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] rounded-xl overflow-hidden border border-border bg-card animate-fade-in">
        <div className="min-h-[240px]">
          <EtfNetFlow />
        </div>
        <div className="flex flex-col lg:pb-10">
          <div className="flex-1 min-h-[80px]">
            <PuellStatus />
          </div>
          <div className="flex-1 min-h-[80px]">
            <SocialSentiment />
          </div>
          <div className="flex-1 min-h-[80px]">
            <BtcHoldings />
          </div>
        </div>
      </div>

      <LatestArticles onOpen={openArticle} onAll={() => go("articles")} />

      <HomeBlocks />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-display text-base sm:text-lg text-white mb-2">TRADER<span className="text-primary">KA</span>.RU — бесплатное крипто сообщество трейдеров</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Следите за курсами криптовалют онлайн, читайте свежие новости рынка и делитесь идеями в{" "}
          <Link to="/community" className="text-primary hover:underline">соцсети для трейдеров</Link>: публикуйте посты, отмечайте монеты и бычий или медвежий настрой, подписывайтесь на авторов. За активность на сайте вы получаете очки, статусы, достижения и бонусы. Читать и участвовать можно бесплатно: график биткоина, притоки и оттоки бирж, портфель и конвертер доступны в одном окне.
        </p>
      </section>

      <p className="text-xs text-muted-foreground/70 pb-2">
        Информация на сайте не является инвестиционной рекомендацией. Торговля криптовалютой связана с высоким риском.
      </p>
    </div>
  );
};

export default WelcomeChannel;