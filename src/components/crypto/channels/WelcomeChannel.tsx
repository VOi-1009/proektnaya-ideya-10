import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Coin, COIN_META, fmtBig, fmtPct, fmtPrice } from "@/lib/crypto";
import LatestArticles from "../LatestArticles";
import HomeBlocks from "../HomeBlocks";
import TopNewsBlock from "../TopNewsBlock";
import BtcLiveChart from "../BtcLiveChart";
import MarketMetricsRow from "../MarketMetricsRow";
import OnlineMarquee from "../OnlineMarquee";
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

const FEATURES = [
  { icon: "Activity", title: "Комьюнити", desc: "Создавайте группы, общайтесь с экспертами и единомышленниками в безопасной среде." },
  { icon: "CandlestickChart", title: "Развитие", desc: "Учитесь, анализируйте рыночные тренды и расширяйте кругозор." },
  { icon: "Newspaper", title: "Достоверность", desc: "Только проверенные источники новостей и точные данные по котировкам." },
  { icon: "Star", title: "Доступность", desc: "Работаем стабильно, без необходимости использования VPN." },
];

const WelcomeChannel = ({ coins, go, openArticle }: Props) => {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  const cryptos = coins.filter((c) => !c.kind);
  const totalCap = cryptos.reduce((s, c) => s + c.market_cap, 0);
  const btc = cryptos.find((c) => c.id === "bitcoin");
  const dominance = btc ? (btc.market_cap / totalCap) * 100 : 0;
  const sorted = [...cryptos].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return setErr("Укажите почту или ник в MAX");
    if (!/^@[a-zA-Z0-9_]{4,}$/.test(v) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
      return setErr("Похоже на опечатку: нужен e-mail или @ник");
    setErr("");
    setEmail("");
    toast({ title: "Вы в списке!", description: "Утренний дайджест рынка придёт завтра в 9:00 МСК." });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-[20fr_50fr_30fr] gap-3 animate-scale-in">
        <div className="p-2 sm:p-3 rounded-xl border border-border bg-card min-w-0 lg:order-2">
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-1.5">Сводка по рынку на сегодня</div>
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
          {btc && (
            <p className="mt-3 text-muted-foreground text-sm">
              Bitcoin торгуется по <span className="font-mono text-white">{fmtPrice(btc.current_price)}</span>.{" "}
              <button onClick={() => go("market", "bitcoin")} className="text-primary hover:underline">
                Открыть график →
              </button>
            </p>
          )}
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
          <UpcomingEvents onAll={() => go("calendar")} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 rounded-xl overflow-hidden border border-border animate-scale-in bg-card">
        <div className="contents">
          <div className="flex flex-col bg-gradient-to-br from-primary/20 via-card to-card">
            <div className="p-3 sm:p-4">
              <div className="text-primary font-mono text-xs mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> РЫНОК ОТКРЫТ 24/7
              </div>
              <h2 className="font-display text-xl sm:text-3xl text-white leading-tight">Новости рынков и мира.</h2>
              <p className="text-muted-foreground text-sm mt-1 max-w-xl">
                Ваш надежный источник информации и площадка для общения. Котировки криптовалют, нефти, золота и валют, графики, новости и ваш портфель — на одной странице.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button onClick={() => go("market")} className="font-semibold">
                  <Icon name="CandlestickChart" size={16} className="mr-2" />
                  Котировки
                </Button>
                <Button
                  variant="outline"
                  onClick={() => go("portfolio")}
                  className="bg-transparent border-input text-foreground hover:bg-hover hover:text-white"
                >
                  Мой портфель
                </Button>
              </div>
            </div>
            <div className="flex-1 flex flex-col border-t border-transparent">
              <QuoteBlock />
              <div className="flex-1 min-h-[60px] border-t border-transparent flex items-center overflow-hidden">
                <div className="w-full">
                  <OnlineMarquee />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-transparent">
            <BtcLiveChart onOpen={() => go("market", "bitcoin")} />
          </div>
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



      <div className="bg-card border border-border rounded-lg p-4 sm:p-5 animate-fade-in" style={{ animationDelay: "300ms" }}>
        <h3 className="font-display text-lg sm:text-xl text-white mb-4">Что умеет TRADERKA.RU</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-2 rounded hover:bg-hover/60 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                <Icon name={f.icon} size={18} />
              </div>
              <div>
                <div className="text-white font-medium text-sm">{f.title}</div>
                <div className="text-muted-foreground text-sm">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button onClick={() => go("market")} className="font-semibold">
            <Icon name="CandlestickChart" size={16} className="mr-2" />
            Смотреть котировки
          </Button>
          <Button onClick={() => go("news")} variant="outline" className="bg-transparent border-input text-foreground hover:bg-hover hover:text-white">
            <Icon name="Newspaper" size={16} className="mr-2" />
            Читать новости
          </Button>
        </div>
      </div>

      <div id="subscribe" className="bg-gradient-to-br from-primary/15 to-card border border-primary/30 rounded-lg p-4 sm:p-5">
        <div className="flex items-center gap-2 text-primary text-xs font-mono mb-2">
          <Icon name="Bell" size={14} /> ДАЙДЖЕСТ
        </div>
        <h3 className="font-display text-lg sm:text-xl text-white mb-1">Утренняя сводка рынка</h3>
        <p className="text-muted-foreground text-sm mb-4">Каждый день в 9:00 — главные движения и новости за ночь. Пять минут чтения.</p>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-lg" noValidate>
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (err) setErr("");
            }}
            placeholder="почта или @ник в MAX"
            className={`flex-1 bg-rail rounded px-3 py-2 text-sm outline-none border placeholder:text-muted-foreground ${
              err ? "border-down" : "border-transparent focus:border-primary"
            }`}
          />
          <Button type="submit" className="font-semibold">Подписаться</Button>
        </form>
        {err && <div className="text-down text-xs mt-2">{err}</div>}
      </div>

      <p className="text-xs text-muted-foreground/70 pb-2">
        Информация на сайте не является инвестиционной рекомендацией. Торговля криптовалютой связана с высоким риском.
      </p>
    </div>
  );
};

export default WelcomeChannel;