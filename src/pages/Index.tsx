import { useEffect, useState } from "react";
import { useMarkets } from "@/lib/crypto";
import { useMobileRedirect } from "@/lib/mobile";
import Ticker from "@/components/crypto/Ticker";
import { getSeen, useNews } from "@/components/crypto/news";
import { usePriceAlerts } from "@/lib/alerts";
import { useChatRooms } from "@/lib/chat";
import { useRadars } from "@/lib/radars";
import HomeNav from "@/components/crypto/home/HomeNav";
import HomeSidebar from "@/components/crypto/home/HomeSidebar";
import HomeMain from "@/components/crypto/home/HomeMain";
import { CHANNELS, PINNED } from "@/components/crypto/home/homeConfig";

const Index = () => {
  useMobileRedirect();
  const { data, isLoading, dataUpdatedAt } = useMarkets();
  const coins = data?.coins ?? [];
  const [channel, setChannel] = useState("welcome");
  const [selected, setSelected] = useState("bitcoin");
  const [articleId, setArticleId] = useState<number | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { data: chatRooms } = useChatRooms();
  const { data: radarList } = useRadars();
  const { data: news } = useNews("crypto");
  const alertsApi = usePriceAlerts(coins, !!data?.live);
  const activeAlerts = alertsApi.alerts.filter((a) => !a.triggeredAt).length;
  const [seen, setSeen] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("c");
    if (c) {
      setChannel(c);
      const coin = q.get("coin");
      if (coin) setSelected(coin);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  useEffect(() => {
    setSeen(getSeen("crypto"));
  }, []);
  useEffect(() => {
    setNow(Date.now());
  }, [news]);
  useEffect(() => {
    if (channel === "news") setSeen(getSeen("crypto"));
  }, [channel, news]);
  const unreadFrom = now ? Math.max(seen, now - 12 * 3600_000) : Infinity;
  const unread = (news?.items ?? []).filter((n) => n.ts > unreadFrom).length;
  const unreadOf = (id: string) => (id === "news" && channel !== "news" ? unread : 0);

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
  const sideCoins = PINNED.map((id) => coins.find((c) => c.id === id)).filter((c): c is (typeof coins)[number] => !!c);
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
            articleId={articleId}
            setArticleId={setArticleId}
            setMobileSidebarOpen={setMobileSidebarOpen}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;