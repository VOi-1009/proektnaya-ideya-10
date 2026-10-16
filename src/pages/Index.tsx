import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { COIN_META, fmtPct, fmtPrice, useMarkets } from "@/lib/crypto";
import Ticker from "@/components/crypto/Ticker";
import { CoinLogo } from "@/components/crypto/QuotesTable";
import WelcomeChannel from "@/components/crypto/channels/WelcomeChannel";
import MarketChannel from "@/components/crypto/channels/MarketChannel";
import NewsChannel from "@/components/crypto/channels/NewsChannel";
import ConverterChannel from "@/components/crypto/channels/ConverterChannel";
import PortfolioChannel from "@/components/crypto/channels/PortfolioChannel";
import { useAuth } from "@/lib/auth";
import { getSeen, useNews } from "@/components/crypto/news";
import { Skeleton } from "@/components/ui/skeleton";

const CHANNELS = [
  { id: "welcome", name: "обзор-рынка", topic: "Сводка дня и главное за утро", icon: "Hash" },
  { id: "market", name: "котировки", topic: "Цены и графики топовых монет в реальном времени", icon: "Hash" },
  { id: "news", name: "новости", topic: "Криптоновости, аналитика и регулирование", icon: "Hash" },
  { id: "portfolio", name: "мой-портфель", topic: "Стоимость ваших монет, прибыль и убыток", icon: "Hash" },
  { id: "converter", name: "конвертер", topic: "Пересчёт монет по текущему курсу", icon: "Hash" },
];

const VOICE = [
  { name: "Трейдинг-рум", people: 12 },
  { name: "Разбор графиков", people: 4 },
];

const MEMBERS = [
  { name: "Ольга Графики", status: "Рисует уровни по SOL", avatar: "О", cls: "bg-amber-400 text-black", role: "Аналитики" },
  { name: "Денис Нода", status: "Читает whitepaper", avatar: "Д", cls: "bg-sky-500 text-white", role: "Аналитики" },
  { name: "Тимур Скальпер", status: "Смотрит график BTC", avatar: "Т", cls: "bg-violet-400 text-black", role: "Трейдеры" },
  { name: "Мария Пулы", status: "В DeFi", avatar: "М", cls: "bg-pink-400 text-black", role: "Трейдеры" },
];

const loadFavs = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem("svecha-favs") ?? "null");
    return Array.isArray(v) ? v : ["bitcoin", "ethereum", "the-open-network"];
  } catch {
    return ["bitcoin", "ethereum", "the-open-network"];
  }
};

const Index = () => {
  const { data, isLoading, dataUpdatedAt } = useMarkets();
  const coins = data?.coins ?? [];
  const [channel, setChannel] = useState("welcome");
  const [selected, setSelected] = useState("bitcoin");
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { user, logout, setAuthOpen } = useAuth();
  const { data: news } = useNews();
  const [seen, setSeen] = useState(getSeen);
  useEffect(() => {
    if (channel === "news") setSeen(getSeen());
  }, [channel, news]);
  const unreadFrom = Math.max(seen, Date.now() - 12 * 3600_000);
  const unread = (news?.items ?? []).filter((n) => n.ts > unreadFrom).length;

  useEffect(() => {
    localStorage.setItem("svecha-favs", JSON.stringify(favs));
  }, [favs]);

  const toggleFav = (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const go = (ch: string, coinId?: string) => {
    setChannel(ch);
    if (coinId) setSelected(coinId);
    setMobileSidebarOpen(false);
    setMobileMenuOpen(false);
    document.getElementById("chat-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const current = CHANNELS.find((c) => c.id === channel)!;
  const favCoins = coins.filter((c) => favs.includes(c.id));
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setDraft("");
    toast({ title: "Сообщение отправлено", description: "Общий чат трейдеров открывается совсем скоро — мы сохраним ваше место." });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-body">
      {/* Навигация */}
      <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <button onClick={() => go("welcome")} className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
              <Icon name="CandlestickChart" size={20} />
            </div>
            <div className="text-left">
              <h1 className="font-display text-lg sm:text-xl text-white leading-none">Свеча</h1>
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
                {(c.name[0].toUpperCase() + c.name.slice(1)).replace("-", " ")}
              </Button>
            ))}
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-white hover:bg-hover">
              <a href="https://t.me/" target="_blank" rel="noreferrer">
                <Icon name="Send" size={16} className="mr-2" />
                Telegram
              </a>
            </Button>
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
                <Icon name="Hash" size={16} className="mr-2" />
                {c.name}
              </Button>
            ))}
            <Button variant="ghost" asChild className="justify-start text-muted-foreground hover:text-white hover:bg-hover">
              <a href="https://t.me/" target="_blank" rel="noreferrer">
                <Icon name="Send" size={16} className="mr-2" />
                Telegram-канал
              </a>
            </Button>
          </div>
        )}
      </nav>

      {coins.length > 0 && <Ticker coins={coins} onPick={(id) => go("market", id)} />}

      <div className="flex min-h-[calc(100vh-96px)]">
        {/* Рейл «серверов» — монеты */}
        <div className="hidden lg:flex w-[72px] bg-rail flex-col items-center py-3 gap-2 flex-shrink-0">
          <button
            onClick={() => go("welcome")}
            className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl hover:rounded-xl transition-all duration-200 flex items-center justify-center"
            title="Свеча"
          >
            <Icon name="CandlestickChart" size={22} />
          </button>
          <div className="w-8 h-[2px] bg-hover rounded-full" />
          {isLoading
            ? [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="w-12 h-12 rounded-3xl bg-hover" />)
            : coins.map((c) => {
                const active = channel === "market" && selected === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => go("market", c.id)}
                    title={`${COIN_META[c.id]?.ru ?? c.name} · ${fmtPrice(c.current_price)}`}
                    className="relative group"
                  >
                    <span
                      className={`absolute -left-3 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r transition-all ${
                        active ? "h-10" : "h-0 group-hover:h-5"
                      }`}
                    />
                    <div
                      className={`w-12 h-12 flex items-center justify-center bg-hover transition-all duration-200 ${
                        active ? "rounded-xl" : "rounded-3xl group-hover:rounded-xl"
                      }`}
                    >
                      <CoinLogo coin={c} size={30} />
                    </div>
                  </button>
                );
              })}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-w-0">
          {/* Каналы */}
          <aside
            className={`${mobileSidebarOpen ? "flex" : "hidden"} lg:flex w-full lg:w-60 bg-card flex-col flex-shrink-0`}
          >
            <div className="h-12 px-4 border-b border-border flex items-center justify-between shadow-sm">
              <h2 className="text-white font-semibold text-sm">Свеча · Трейдеры</h2>
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
                      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left transition-colors ${
                        channel === c.id ? "bg-hover text-white" : "text-muted-foreground hover:text-foreground hover:bg-hover/60"
                      }`}
                    >
                      <Icon name="Hash" size={18} className="opacity-70" />
                      <span className="text-[15px]">{c.name}</span>
                      {c.id === "news" && channel !== "news" && unread > 0 && (
                        <span className="ml-auto bg-down text-white text-[10px] font-bold rounded-full px-1.5">
                          {unread > 30 ? "30+" : unread}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  <Icon name="ChevronDown" size={12} />
                  <span>Голосовые каналы</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {VOICE.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => toast({ title: v.name, description: "Голосовые эфиры стартуют вместе с открытием сообщества." })}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-hover/60"
                    >
                      <Icon name="Volume2" size={16} className="opacity-70" />
                      <span className="text-[15px]">{v.name}</span>
                      <span className="ml-auto text-[11px] font-mono">{v.people}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-2 bg-rail/70 flex items-center gap-2">
              <div className="relative w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-display text-sm uppercase">
                {user ? user.email[0] : "Г"}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-card rounded-full ${user ? "bg-up" : "bg-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{user ? user.email : "Гость"}</div>
                <div className="text-muted-foreground text-xs truncate">
                  {user ? "Портфель в облаке" : `Избранных: ${favs.length}`}
                </div>
              </div>
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
              <Icon name="Hash" size={20} className="text-muted-foreground" />
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
                <button onClick={() => go("news")} className="hover:text-white" aria-label="Новости">
                  <Icon name="Bell" size={18} />
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
                  <WelcomeChannel coins={coins} go={go} />
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
                  <NewsChannel />
                ) : channel === "portfolio" ? (
                  <PortfolioChannel coins={coins} go={go} />
                ) : (
                  <ConverterChannel coins={coins} />
                )}
              </div>
            </div>

            <form onSubmit={send} className="p-3 sm:p-4">
              <div className="bg-hover rounded-lg px-3 sm:px-4 py-2.5 flex items-center gap-3">
                <Icon name="CirclePlus" size={20} className="text-muted-foreground" />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Сообщение #${current.name}`}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
                <button type="submit" className="text-muted-foreground hover:text-primary" aria-label="Отправить">
                  <Icon name="SendHorizontal" size={18} />
                </button>
              </div>
            </form>
          </main>

          {/* Правая панель: избранное и участники */}
          <aside className="hidden xl:block w-64 bg-card p-3 flex-shrink-0 space-y-5">
            <div>
              <h3 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <Icon name="Star" size={12} /> Мой список — {favCoins.length}
              </h3>
              <div className="space-y-0.5">
                {favCoins.map((c) => {
                  const up = c.price_change_percentage_24h >= 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => go("market", c.id)}
                      className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-hover/60 text-left"
                    >
                      <CoinLogo coin={c} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{COIN_META[c.id]?.ru ?? c.name}</div>
                        <div className="text-muted-foreground text-xs font-mono tabular">{fmtPrice(c.current_price)}</div>
                      </div>
                      <span className={`text-xs font-mono tabular ${up ? "text-up" : "text-down"}`}>
                        {fmtPct(c.price_change_percentage_24h)}
                      </span>
                    </button>
                  );
                })}
                {!favCoins.length && (
                  <p className="text-xs text-muted-foreground px-2">Отметьте монеты звёздочкой в #котировки</p>
                )}
              </div>
            </div>
            {["Аналитики", "Трейдеры"].map((role) => (
              <div key={role}>
                <h3 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 px-2">
                  {role} — {MEMBERS.filter((m) => m.role === role).length}
                </h3>
                <div className="space-y-0.5">
                  {MEMBERS.filter((m) => m.role === role).map((m) => (
                    <div key={m.name} className="flex items-center gap-2.5 p-2 rounded hover:bg-hover/60 cursor-pointer">
                      <div className={`relative w-8 h-8 rounded-full flex items-center justify-center font-display text-sm ${m.cls}`}>
                        {m.avatar}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-up border-2 border-card rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{m.name}</div>
                        <div className="text-muted-foreground text-xs truncate">{m.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Index;