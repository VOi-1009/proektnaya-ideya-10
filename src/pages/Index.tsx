import { useEffect, useState } from "react";
import { useMarkets } from "@/lib/crypto";
import Ticker from "@/components/crypto/Ticker";
import { getSeen, useNews } from "@/components/crypto/news";
import { usePriceAlerts } from "@/lib/alerts";
import { useChatRooms } from "@/lib/chat";
import { useRadars } from "@/lib/radars";
import HomeNav from "@/components/crypto/home/HomeNav";
import HomeSidebar from "@/components/crypto/home/HomeSidebar";
import HomeMain from "@/components/crypto/home/HomeMain";
import HomeRightPanel from "@/components/crypto/home/HomeRightPanel";
import { CHANNELS, PINNED, loadFavs } from "@/components/crypto/home/homeConfig";

const Index = () => {
  const { data, isLoading, dataUpdatedAt } = useMarkets();
  const coins = data?.coins ?? [];
  const [channel, setChannel] = useState("welcome");
  const [selected, setSelected] = useState("bitcoin");
  const [articleId, setArticleId] = useState<number | null>(null);
  const [favs, setFavs] = useState<string[]>(["ethereum", "gold"]);
  const [favsLoaded, setFavsLoaded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { data: chatRooms } = useChatRooms();
  const { data: radarList } = useRadars();
  const { data: news } = useNews("crypto");
  const { data: worldNews } = useNews("world");
  const alertsApi = usePriceAlerts(coins, !!data?.live);
  const activeAlerts = alertsApi.alerts.filter((a) => !a.triggeredAt).length;
  const [seen, setSeen] = useState(0);
  const [seenWorld, setSeenWorld] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setSeen(getSeen("crypto"));
    setSeenWorld(getSeen("world"));
    setFavs(loadFavs());
    setFavsLoaded(true);
  }, []);
  useEffect(() => {
    setNow(Date.now());
  }, [news, worldNews]);
  useEffect(() => {
    if (channel === "news") setSeen(getSeen("crypto"));
    if (channel === "world") setSeenWorld(getSeen("world"));
  }, [channel, news, worldNews]);
  const unreadFrom = now ? Math.max(seen, now - 12 * 3600_000) : Infinity;
  const unread = (news?.items ?? []).filter((n) => n.ts > unreadFrom).length;
  const unreadWorldFrom = now ? Math.max(seenWorld, now - 12 * 3600_000) : Infinity;
  const unreadWorld = (worldNews?.items ?? []).filter((n) => n.ts > unreadWorldFrom).length;
  const unreadOf = (id: string) => (id === "news" && channel !== "news" ? unread : id === "world" && channel !== "world" ? unreadWorld : 0);

  useEffect(() => {
    if (favsLoaded) localStorage.setItem("svecha-favs", JSON.stringify(favs));
  }, [favs, favsLoaded]);

  const toggleFav = (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const go = (ch: string, coinId?: string) => {
    setChannel(ch);
    setArticleId(null);
    if (coinId) setSelected(coinId);
    setMobileSidebarOpen(false);
    document.getElementById("chat-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chatChannels = (chatRooms ?? []).map((r) => ({ id: `chat-${r.id}`, name: r.name, topic: r.topic }));
  const radarChannels = (radarList ?? []).map((r) => ({ id: `radar-${r.id}`, name: r.title, topic: r.kind === "liq_heatmap" ? `${r.description || "Радар"} · ${r.symbol}` : r.description || "Радар" }));
  const current = [...CHANNELS, ...chatChannels, ...radarChannels].find((c) => c.id === channel) ?? CHANNELS[0];
  const favCoins = coins.filter((c) => favs.includes(c.id));
  const sideCoins = [
    ...PINNED.map((id) => coins.find((c) => c.id === id)).filter((c): c is (typeof coins)[number] => !!c),
    ...favCoins.filter((c) => !PINNED.includes(c.id)),
  ];
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-body">
      <HomeNav go={go} />

      {coins.length > 0 && <Ticker coins={coins} onPick={(id) => go("market", id)} />}

      <div className="flex min-h-[calc(100vh-96px)]">
        <div className="flex-1 flex flex-col lg:flex-row min-w-0">
          <HomeSidebar
            channel={channel}
            go={go}
            activeAlerts={activeAlerts}
            unreadOf={unreadOf}
            mobileSidebarOpen={mobileSidebarOpen}
            setMobileSidebarOpen={setMobileSidebarOpen}
          />
          <HomeMain
            channel={channel}
            current={current}
            go={go}
            coins={coins}
            sideCoins={sideCoins}
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
          <HomeRightPanel favsCount={favs.length} />
        </div>
      </div>
    </div>
  );
};

export default Index;