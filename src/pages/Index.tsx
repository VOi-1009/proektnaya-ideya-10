import { useEffect, useState } from "react";
import { useMarkets } from "@/lib/crypto";
import Ticker from "@/components/crypto/Ticker";
import { getSeen, useNews } from "@/components/crypto/news";
import { usePriceAlerts } from "@/lib/alerts";
import HomeNav from "@/components/crypto/home/HomeNav";
import HomeSidebar from "@/components/crypto/home/HomeSidebar";
import HomeMain from "@/components/crypto/home/HomeMain";
import HomeRightPanel from "@/components/crypto/home/HomeRightPanel";
import { CHANNELS, CHAT_CHANNELS, PINNED, loadFavs } from "@/components/crypto/home/homeConfig";

const Index = () => {
  const { data, isLoading, dataUpdatedAt } = useMarkets();
  const coins = data?.coins ?? [];
  const [channel, setChannel] = useState("welcome");
  const [selected, setSelected] = useState("bitcoin");
  const [articleId, setArticleId] = useState<number | null>(null);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { data: news } = useNews("crypto");
  const { data: worldNews } = useNews("world");
  const alertsApi = usePriceAlerts(coins, !!data?.live);
  const activeAlerts = alertsApi.alerts.filter((a) => !a.triggeredAt).length;
  const [seen, setSeen] = useState(() => getSeen("crypto"));
  const [seenWorld, setSeenWorld] = useState(() => getSeen("world"));
  useEffect(() => {
    if (channel === "news") setSeen(getSeen("crypto"));
    if (channel === "world") setSeenWorld(getSeen("world"));
  }, [channel, news, worldNews]);
  const unreadFrom = Math.max(seen, Date.now() - 12 * 3600_000);
  const unread = (news?.items ?? []).filter((n) => n.ts > unreadFrom).length;
  const unreadWorldFrom = Math.max(seenWorld, Date.now() - 12 * 3600_000);
  const unreadWorld = (worldNews?.items ?? []).filter((n) => n.ts > unreadWorldFrom).length;
  const unreadOf = (id: string) => (id === "news" && channel !== "news" ? unread : id === "world" && channel !== "world" ? unreadWorld : 0);

  useEffect(() => {
    localStorage.setItem("svecha-favs", JSON.stringify(favs));
  }, [favs]);

  const toggleFav = (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const go = (ch: string, coinId?: string) => {
    setChannel(ch);
    setArticleId(null);
    if (coinId) setSelected(coinId);
    setMobileSidebarOpen(false);
    setMobileMenuOpen(false);
    document.getElementById("chat-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const current = [...CHANNELS, ...CHAT_CHANNELS].find((c) => c.id === channel) ?? CHANNELS[0];
  const favCoins = coins.filter((c) => favs.includes(c.id));
  const sideCoins = [
    ...PINNED.map((id) => coins.find((c) => c.id === id)).filter((c): c is (typeof coins)[number] => !!c),
    ...favCoins.filter((c) => !PINNED.includes(c.id)),
  ];
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-body">
      <HomeNav channel={channel} go={go} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {coins.length > 0 && <Ticker coins={coins} onPick={(id) => go("market", id)} />}

      <div className="flex min-h-[calc(100vh-96px)]">
        <div className="hidden lg:flex w-[72px] bg-rail flex-col items-center py-3 gap-2 flex-shrink-0">
          <button
            onClick={() => go("welcome")}
            className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl hover:rounded-xl transition-all duration-200 flex items-center justify-center"
            title="TRADERKA.RU"
          >
            <span className="font-display font-black text-2xl leading-none text-white">Т</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-w-0">
          <HomeSidebar
            channel={channel}
            go={go}
            activeAlerts={activeAlerts}
            unreadOf={unreadOf}
            mobileSidebarOpen={mobileSidebarOpen}
            setMobileSidebarOpen={setMobileSidebarOpen}
            favsCount={favs.length}
          />
          <HomeMain
            channel={channel}
            current={current}
            go={go}
            coins={coins}
            live={!!data?.live}
            isLoading={isLoading}
            updated={updated}
            activeAlerts={activeAlerts}
            alertsApi={alertsApi}
            selected={selected}
            setSelected={setSelected}
            favs={favs}
            toggleFav={toggleFav}
            articleId={articleId}
            setArticleId={setArticleId}
            setMobileSidebarOpen={setMobileSidebarOpen}
          />
          <HomeRightPanel sideCoins={sideCoins} go={go} />
        </div>
      </div>
    </div>
  );
};

export default Index;
