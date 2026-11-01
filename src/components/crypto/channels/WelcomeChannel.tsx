import { Coin } from "@/lib/crypto";
import LatestArticles from "../LatestArticles";
import HomeBlocks from "../HomeBlocks";
import TopNewsBlock from "../TopNewsBlock";
import BtcLiveChart from "../BtcLiveChart";
import FearGreedGauge from "../FearGreedGauge";
import AltseasonGauge from "../AltseasonGauge";
import UpcomingEvents from "../UpcomingEvents";
import LiqBars from "../LiqBars";
import LiqHistory from "../LiqHistory";
import AchievementsMini from "../home/AchievementsMini";
import FundMini from "../home/FundMini";
import MarketSummary from "../home/MarketSummary";
import EtfNetFlow from "../EtfNetFlow";
import SocialSentiment from "../SocialSentiment";
import PuellStatus from "../PuellStatus";
import BtcHoldings from "../BtcHoldings";
import LiqInsights from "../LiqInsights";
import SidePolls from "../SidePolls";
import { Link } from "@/lib/router-compat";

interface Props {
  coins: Coin[];
  go: (channel: string, coinId?: string) => void;
  openArticle: (id: number) => void;
}

const WelcomeChannel = ({ coins, go, openArticle }: Props) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-[18fr_32fr_32fr_18fr] gap-3 animate-scale-in">
        <div className="p-2 sm:p-3 rounded-xl border border-border bg-card min-w-0 lg:order-2 flex flex-col gap-2">
          <MarketSummary coins={coins} go={go} />
        </div>
        <div className="rounded-xl border border-border bg-card min-h-[120px] lg:order-1 flex flex-col divide-y divide-transparent">
          <div className="flex-[2] grid grid-cols-2">
            <FearGreedGauge compact />
            <AltseasonGauge compact />
          </div>
          <div className="hidden lg:flex flex-1 min-h-[60px] px-3 py-2 items-center justify-center">
            <AchievementsMini />
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
            <div className="flex-1 min-h-[100px]">
              <FundMini onOpen={() => go("fund")} />
            </div>
            <div className="flex-1 min-h-[260px]">
              <LiqHistory />
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

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:gap-6 md:items-start">
        <div className="flex-1 min-w-0">
        <h2 className="font-display text-base sm:text-lg text-white mb-2">TRADER<span className="text-primary">KA</span>.RU — бесплатное крипто сообщество трейдеров</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Следите за курсами криптовалют онлайн, читайте свежие новости рынка и делитесь идеями в{" "}
          <Link to="/community" className="text-primary hover:underline">соцсети для трейдеров</Link>: публикуйте посты, отмечайте монеты и бычий или медвежий настрой, подписывайтесь на авторов. За активность на сайте вы получаете очки, статусы, достижения и бонусы. Читать и участвовать можно бесплатно: график биткоина, притоки и оттоки бирж, портфель и конвертер доступны в одном окне.
        </p>
        </div>
        <div className="w-full md:w-72 flex-shrink-0">
          <SidePolls />
        </div>
      </section>

      <p className="text-xs text-muted-foreground/70 pb-2">
        Информация на сайте не является инвестиционной рекомендацией. Торговля криптовалютой связана с высоким риском.
      </p>
    </div>
  );
};

export default WelcomeChannel;