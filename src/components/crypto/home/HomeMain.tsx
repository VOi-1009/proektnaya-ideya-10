import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Coin } from "@/lib/crypto";
import WelcomeChannel from "@/components/crypto/channels/WelcomeChannel";
import { ChatRoom } from "@/lib/chat";
import { PriceAlertsApi } from "@/lib/alerts";
import { GoFn } from "./homeConfig";
import HeaderQuotes from "./HeaderQuotes";

const MarketChannel = lazy(() => import("@/components/crypto/channels/MarketChannel"));
const CalendarChannel = lazy(() => import("@/components/crypto/channels/CalendarChannel"));
const NewsChannel = lazy(() => import("@/components/crypto/channels/NewsChannel"));
const ConverterChannel = lazy(() => import("@/components/crypto/channels/ConverterChannel"));
const PortfolioChannel = lazy(() => import("@/components/crypto/channels/PortfolioChannel"));
const ArticlesChannel = lazy(() => import("@/components/crypto/channels/ArticlesChannel"));
const AlertsChannel = lazy(() => import("@/components/crypto/channels/AlertsChannel"));
const ChatChannel = lazy(() => import("@/components/crypto/channels/ChatChannel"));
const AiNewsChannel = lazy(() => import("@/components/crypto/channels/AiNewsChannel"));
const RadarChannel = lazy(() => import("@/components/crypto/channels/RadarChannel"));
const RulesChannel = lazy(() => import("@/components/crypto/channels/RulesChannel"));
const ForumChannel = lazy(() => import("@/components/crypto/channels/ForumChannel"));

const ChannelFallback = () => (
  <div className="space-y-3">
    <Skeleton className="h-56 w-full bg-card" />
    <Skeleton className="h-24 w-full bg-card" />
  </div>
);

interface Props {
  channel: string;
  current: { name: string; topic: string };
  go: GoFn;
  coins: Coin[];
  live: boolean;
  isLoading: boolean;
  updated: string;
  activeAlerts: number;
  alertsApi: PriceAlertsApi;
  selected: string;
  setSelected: (id: string) => void;
  favs: string[];
  toggleFav: (id: string) => void;
  articleId: number | null;
  setArticleId: (id: number | null) => void;
  setMobileSidebarOpen: (v: boolean) => void;
}

const HomeMain = ({
  channel,
  current,
  go,
  coins,
  live,
  isLoading,
  updated,
  activeAlerts,
  alertsApi,
  selected,
  setSelected,
  favs,
  toggleFav,
  articleId,
  setArticleId,
  setMobileSidebarOpen,
}: Props) => (
  <main className="flex-1 flex flex-col min-w-0 grain">
    <div className="h-12 border-b border-border flex items-center px-4 gap-2 shadow-sm bg-background/80 backdrop-blur">
      <Button
        variant="ghost"
        className="lg:hidden text-muted-foreground hover:text-white hover:bg-hover p-1 h-auto mr-1"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Каналы"
      >
        <Icon name="Menu" size={20} />
      </Button>
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${channel === "ainews" ? "bg-white" : "bg-primary"}`} />
      <span className="text-white font-semibold">{current.name.replace(/-/g, " ")}</span>
      <div className="w-px h-6 bg-hover mx-2 hidden sm:block" />
      <span className="text-muted-foreground text-sm hidden sm:block truncate">{current.topic}</span>
      <div className="ml-auto flex items-center gap-3 text-muted-foreground min-w-0">
        <HeaderQuotes coins={coins} go={go} />
        {updated && (
          <span className="hidden 2xl:flex items-center gap-1.5 text-xs font-mono flex-shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-up animate-pulse" : "bg-accent"}`} />
            {live ? "онлайн" : "кэш"} · {updated}
          </span>
        )}
        <button onClick={() => go("alerts")} className="hover:text-white relative" aria-label="Ценовые уведомления" title="Ценовые уведомления">
          <Icon name="Bell" size={18} />
          {activeAlerts > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full min-w-[14px] h-[14px] px-0.5 flex items-center justify-center">
              {activeAlerts}
            </span>
          )}
        </button>
        <button onClick={() => go("market")} className="hover:text-white" aria-label="Поиск монет">
          <Icon name="Search" size={18} />
        </button>
      </div>
    </div>

    <div id="chat-scroll" className="flex-1 p-3 sm:p-4 overflow-y-auto scrollbar-thin">
      <div key={channel}>
        <Suspense fallback={<ChannelFallback />}>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-56 w-full bg-card" />
            <Skeleton className="h-24 w-full bg-card" />
            <Skeleton className="h-24 w-2/3 bg-card" />
          </div>
        ) : channel === "welcome" ? (
          <WelcomeChannel
            coins={coins}
            go={go}
            openArticle={(id) => {
              go("articles");
              setArticleId(id);
            }}
          />
        ) : channel === "market" ? (
          <MarketChannel
            coins={coins}
            selected={selected}
            onSelect={setSelected}
            favs={favs}
            toggleFav={toggleFav}
            live={live}
          />
        ) : channel === "calendar" ? (
          <CalendarChannel />
        ) : channel === "news" ? (
          <NewsChannel key="crypto" kind="crypto" />
        ) : channel === "world" ? (
          <NewsChannel key="world" kind="world" />
        ) : channel === "articles" ? (
          <ArticlesChannel openId={articleId} setOpenId={setArticleId} />
        ) : channel === "ainews" ? (
          <AiNewsChannel />
        ) : channel === "rules" ? (
          <RulesChannel />
        ) : channel === "forum" ? (
          <ForumChannel />
        ) : channel === "alerts" ? (
          <AlertsChannel coins={coins} live={live} api={alertsApi} go={go} />
        ) : channel.startsWith("radar-") ? (
          <RadarChannel id={Number(channel.slice(6))} />
        ) : channel.startsWith("chat-") ? (
          <ChatChannel room={channel.slice(5) as ChatRoom} />
        ) : channel === "portfolio" ? (
          <PortfolioChannel coins={coins} go={go} />
        ) : (
          <ConverterChannel coins={coins} />
        )}
        </Suspense>
      </div>
    </div>

  </main>
);

export default HomeMain;
