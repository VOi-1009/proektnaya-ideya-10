import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { COIN_META, fmtPct, fmtPrice, useMarkets } from "@/lib/crypto";
import Ticker from "@/components/crypto/Ticker";
import WelcomeChannel from "@/components/crypto/channels/WelcomeChannel";
import MarketChannel from "@/components/crypto/channels/MarketChannel";
import NewsChannel from "@/components/crypto/channels/NewsChannel";
import ConverterChannel from "@/components/crypto/channels/ConverterChannel";
import PortfolioChannel from "@/components/crypto/channels/PortfolioChannel";
import { useAuth } from "@/lib/auth";
import { getSeen, useNews } from "@/components/crypto/news";
import ArticlesChannel from "@/components/crypto/channels/ArticlesChannel";
import AlertsChannel from "@/components/crypto/channels/AlertsChannel";
import { usePriceAlerts } from "@/lib/alerts";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/crypto/UserAvatar";
import StatusBadge from "@/components/crypto/StatusBadge";
import OnlineList from "@/components/crypto/OnlineList";
import { SideBlocks } from "@/components/crypto/HomeBlocks";

const CHANNELS = [
  { id: "welcome", name: "обзор-рынка", topic: "Сводка дня и главное за утро", icon: "Hash" },
  { id: "market", name: "котировки", topic: "Цены и графики топовых монет в реальном времени", icon: "Hash" },
  { id: "news", name: "новости-криптовалют", short: "Крипто-новости", topic: "Криптоновости: ForkLog и Bits.media", icon: "Hash" },
  { id: "world", name: "мировые-новости", short: "Мир", topic: "Политика, экономика и события в мире: ТАСС, РБК, Lenta.ru, Ведомости", icon: "Hash" },
  { id: "articles", name: "статьи", topic: "Разборы и обучающие материалы от редакции", icon: "Hash" },
  { id: "alerts", name: "уведомления", topic: "Оповещения о достижении целевой цены", icon: "Hash" },
  { id: "portfolio", name: "мой-портфель", topic: "Стоимость ваших монет, прибыль и убыток", icon: "Hash" },
  { id: "converter", name: "конвертер", topic: "Пересчёт монет, валют и рубля по текущему курсу", icon: "Hash" },
];

const PINNED = ["bitcoin", "brent", "usd-rub", "eur-rub"];

const loadFavs = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem("svecha-favs") ?? "null");
    return Array.isArray(v) ? v : ["ethereum", "gold"];
  } catch {
    return ["ethereum", "gold"];
  }
};

const Index = () => {
  const { data, isLoading, dataUpdatedAt } = useMarkets();
  const coins = data?.coins ?? [];
  const [channel, setChannel] = useState("welcome");
  const [selected, setSelected] = useState("bitcoin");
  const [articleId, setArticleId] = useState<number | null>(null);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, logout, setAuthOpen } = useAuth();
  const navigate = useNavigate();
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

  const current = CHANNELS.find((c) => c.id === channel)!;
  const favCoins = coins.filter((c) => favs.includes(c.id));
  const sideCoins = [
    ...PINNED.map((id) => coins.find((c) => c.id === id)).filter((c): c is (typeof coins)[number] => !!c),
    ...favCoins.filter((c) => !PINNED.includes(c.id)),
  ];
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-body">
      {/* Навигация */}
      <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <button onClick={() => go("welcome")} className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl sm:text-2xl leading-none">
              Т
            </div>
            <div className="text-left">
              <h1 className="font-display text-lg sm:text-xl text-white leading-none tracking-wide">TRADERKA<span className="text-primary">.RU</span></h1>
              <p className="text-xs text-muted-foreground hidden sm:block mt-1">Котировки, графики и новости крипторынка</p>
            </div>
          </button>
          <div className="hidden md:flex items-center gap-1">
            {CHANNELS.slice(1).map((c) => (
              <Button
                key={c.id}
                variant="ghost"
                onClick={() => go(c.id)}
                className={`hover:bg-hover hover:text-white ${channel === c.id ? "text-white bg-hover" : "text-muted-foreground"}`}
              >
                {"short" in c && c.short ? c.short : (c.name[0].toUpperCase() + c.name.slice(1)).replace("-", " ")}
              </Button>
            ))}
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-white hover:bg-hover">
              <a href="https://max.ru/join/NlGkb3arf9YBdWjvXf-a5gVYZdEOEYGX6A79q2w7LEg" target="_blank" rel="noreferrer">
                <Icon name="MessageCircle" size={16} className="mr-2" />
                MAX
              </a>
            </Button>
            {user ? (
              <Button variant="ghost" onClick={() => navigate("/profile")} className="text-muted-foreground hover:text-white hover:bg-hover px-2 gap-2" title="Личный кабинет">
                <UserAvatar name={user.name} email={user.email} avatar={user.avatar} className="w-7 h-7 text-xs" />
                <span className="text-white text-sm max-w-[120px] truncate hidden xl:inline">{user.name || user.email}</span>
                <StatusBadge level={user.level} compact />
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setAuthOpen(true)} className="text-muted-foreground hover:text-white hover:bg-hover">
                <Icon name="UserRound" size={16} className="mr-2" />
                Войти
              </Button>
            )}
            <Button
              className="ml-2 font-semibold"
              onClick={() => {
                go("welcome");
                setTimeout(() => document.getElementById("subscribe")?.scrollIntoView({ behavior: "smooth" }), 100);
              }}
            >
              Дайджест
            </Button>
          </div>
          <Button
            variant="ghost"
            className="md:hidden text-muted-foreground hover:text-white hover:bg-hover p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Меню"
          >
            <Icon name={mobileMenuOpen ? "X" : "Menu"} size={20} />
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-border flex flex-col gap-1 animate-fade-in">
            {CHANNELS.map((c) => (
              <Button key={c.id} variant="ghost" onClick={() => go(c.id)} className="justify-start text-muted-foreground hover:text-white hover:bg-hover">
                <span className="w-2 h-2 rounded-full bg-primary mr-2.5 flex-shrink-0" />
                {c.name}
              </Button>
            ))}
            <Button variant="ghost" asChild className="justify-start text-muted-foreground hover:text-white hover:bg-hover">
              <a href="https://max.ru/join/NlGkb3arf9YBdWjvXf-a5gVYZdEOEYGX6A79q2w7LEg" target="_blank" rel="noreferrer">
                <Icon name="MessageCircle" size={16} className="mr-2" />
                Канал в MAX
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={() => (user ? navigate("/profile") : setAuthOpen(true))}
              className="justify-start text-muted-foreground hover:text-white hover:bg-hover"
            >
              <Icon name="UserRound" size={16} className="mr-2" />
              {user ? "Личный кабинет" : "Войти"}
            </Button>
          </div>
        )}
      </nav>

      {coins.length > 0 && <Ticker coins={coins} onPick={(id) => go("market", id)} />}

      <div className="flex min-h-[calc(100vh-96px)]">
        {/* Рейл */}
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
          {/* Каналы */}
          <aside
            className={`${mobileSidebarOpen ? "flex" : "hidden"} lg:flex w-full lg:w-60 bg-card flex-col flex-shrink-0`}
          >
            <div className="h-12 px-4 border-b border-border flex items-center justify-between shadow-sm">
              <h2 className="text-white font-semibold text-sm">TRADERKA.RU</h2>
              <Button
                variant="ghost"
                className="lg:hidden text-muted-foreground hover:text-white hover:bg-hover p-1 h-auto"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <Icon name="X" size={16} />
              </Button>
            </div>
            <div className="flex-1 p-2 space-y-4">
              <div>
                <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  <Icon name="ChevronDown" size={12} />
                  <span>Текстовые каналы</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go(c.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                        channel === c.id ? "bg-hover text-white" : "text-muted-foreground hover:text-foreground hover:bg-hover/60"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mx-1" />
                      <span className="text-[15px]">{c.name}</span>
                      {c.id === "alerts" && activeAlerts > 0 && (
                        <span className="ml-auto text-[11px] font-mono text-primary">{activeAlerts}</span>
                      )}
                      {unreadOf(c.id) > 0 && (
                        <span className="ml-auto bg-down text-white text-[10px] font-bold rounded-full px-1.5">
                          {unreadOf(c.id) > 30 ? "30+" : unreadOf(c.id)}
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => navigate("/rating")}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors text-muted-foreground hover:text-foreground hover:bg-hover/60"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mx-1" />
                    <span className="text-[15px]">рейтинг</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-2 bg-rail/70 flex items-center gap-2">
              <button
                onClick={() => (user ? navigate("/profile") : setAuthOpen(true))}
                className="relative"
                title={user ? "Личный кабинет" : "Войти"}
              >
                {user ? (
                  <UserAvatar name={user.name} email={user.email} avatar={user.avatar} />
                ) : (
                  <UserAvatar />
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-card rounded-full ${user ? "bg-up" : "bg-muted-foreground"}`} />
              </button>
              <button
                onClick={() => (user ? navigate("/profile") : setAuthOpen(true))}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-white text-sm font-medium truncate">{user ? user.name || user.email : "Гость"}</span>
                  {user && <StatusBadge level={user.level} compact />}
                </div>
                <div className="text-muted-foreground text-xs truncate hover:text-primary">
                  {user ? "Личный кабинет →" : `Избранных: ${favs.length}`}
                </div>
              </button>
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 hover:bg-hover text-muted-foreground hover:text-down"
                  onClick={() => {
                    logout();
                    toast({ title: "Вы вышли из аккаунта" });
                  }}
                  aria-label="Выйти"
                  title="Выйти"
                >
                  <Icon name="LogOut" size={16} />
                </Button>
              ) : (
                <Button size="sm" className="h-8 px-3 font-semibold" onClick={() => setAuthOpen(true)}>
                  Войти
                </Button>
              )}
            </div>
          </aside>

          {/* Чат */}
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
              <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-white font-semibold">{current.name}</span>
              <div className="w-px h-6 bg-hover mx-2 hidden sm:block" />
              <span className="text-muted-foreground text-sm hidden sm:block truncate">{current.topic}</span>
              <div className="ml-auto flex items-center gap-3 text-muted-foreground">
                {updated && (
                  <span className="hidden md:flex items-center gap-1.5 text-xs font-mono">
                    <span className={`w-1.5 h-1.5 rounded-full ${data?.live ? "bg-up animate-pulse" : "bg-accent"}`} />
                    {data?.live ? "онлайн" : "кэш"} · {updated}
                  </span>
                )}
                <button onClick={() => go("alerts")} className="hover:text-white relative" aria-label="Ценовые уведомления" title="Ценовые уведомления">
                  <Icon name="Bell" size={18} />
                  {activeAlerts > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[14px] h-[14px] px-0.5 flex items-center justify-center">
                      {activeAlerts}
                    </span>
                  )}
                </button>
                <button onClick={() => go("market")} className="hover:text-white" aria-label="Поиск монет">
                  <Icon name="Search" size={18} />
                </button>
              </div>
            </div>

            <div id="chat-scroll" className="flex-1 p-3 sm:p-5 overflow-y-auto scrollbar-thin">
              <div key={channel} className="max-w-5xl">
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
                    live={!!data?.live}
                  />
                ) : channel === "news" ? (
                  <NewsChannel key="crypto" kind="crypto" />
                ) : channel === "world" ? (
                  <NewsChannel key="world" kind="world" />
                ) : channel === "articles" ? (
                  <ArticlesChannel openId={articleId} setOpenId={setArticleId} />
                ) : channel === "alerts" ? (
                  <AlertsChannel coins={coins} live={!!data?.live} api={alertsApi} go={go} />
                ) : channel === "portfolio" ? (
                  <PortfolioChannel coins={coins} go={go} />
                ) : (
                  <ConverterChannel coins={coins} />
                )}
              </div>
            </div>

          </main>

          {/* Правая панель: онлайн и избранное */}
          <aside className="hidden xl:block w-64 bg-card p-3 flex-shrink-0 space-y-5">
            <OnlineList />
            <button
              onClick={() => navigate("/rating")}
              className="w-full flex items-center gap-2 px-2 py-2 rounded bg-rail hover:bg-hover text-sm text-foreground"
            >
              <Icon name="Trophy" size={16} className="text-primary" />
              Рейтинг участников
              <Icon name="ChevronRight" size={14} className="ml-auto text-muted-foreground" />
            </button>
            <div>
              <h3 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <Icon name="Star" size={12} /> Мой список
              </h3>
              <div className="space-y-0">
                {sideCoins.map((c) => {
                  const up = c.price_change_percentage_24h >= 0;
                  const pinned = PINNED.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => go("market", c.id)}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-hover/60 text-left"
                    >
                      <div className="flex-1 min-w-0 leading-tight">
                        <div className="text-white text-sm font-medium truncate font-coin leading-tight flex items-center gap-1">
                          {COIN_META[c.id]?.ru ?? c.name}
                          {pinned && <Icon name="Pin" size={10} className="text-muted-foreground" />}
                        </div>
                        <div className="text-muted-foreground text-[11px] font-mono tabular leading-tight">
                          {fmtPrice(c.current_price, c.id)}
                          {c.id === "brent" && " / барр."}
                          {c.id === "gold" && " / унц."}
                        </div>
                      </div>
                      <span className={`text-xs font-mono tabular ${up ? "text-up" : "text-down"}`}>
                        {fmtPct(c.price_change_percentage_24h)}
                      </span>
                    </button>
                  );
                })}
                {!sideCoins.length && (
                  <p className="text-xs text-muted-foreground px-2">Отметьте монеты звёздочкой в #котировки</p>
                )}
              </div>
            </div>
            <SideBlocks />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Index;