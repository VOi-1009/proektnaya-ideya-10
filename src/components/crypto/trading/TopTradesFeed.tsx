import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPrice } from "@/lib/crypto";
import { fundFmt, useTopFeed } from "@/lib/fund";
import TopTraderBadge from "@/components/crypto/TopTraderBadge";
import { name } from "./shared";

const REASON: Record<string, string> = { stop: "стоп-лосс", take: "тейк-профит", manual: "вручную", liquidation: "ликвидация", time: "по времени" };
const tone = (v: number) => (v >= 0 ? "text-[#16C784]" : "text-[#EA3943]");
const sgn = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fundFmt(Math.abs(v))}`;
const when = (iso: string) => new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const TopTradesFeed = () => {
  const { data, isLoading } = useTopFeed();

  return (
    <section className="rounded-xl border border-border bg-card p-4 min-w-0">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Icon name="Medal" size={16} className="text-primary" />
        <h3 className="font-display text-sm text-white">Сделки лучших трейдеров</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">виртуальные USDT</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        Последние закрытые сделки тех, кто сейчас в тройке рейтинга биржи. Это игра, а не подсказка, что покупать.
      </p>

      {isLoading || !data ? (
        <Skeleton className="h-28 w-full bg-rail" />
      ) : data.feed.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Пока некого показывать: лента появится, когда у трейдеров в тройке будут закрытые сделки.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {data.feed.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2">
              <TopTraderBadge userId={t.userId} size={20} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap text-sm">
                  <span className="text-white font-medium truncate">{t.name}</span>
                  {t.isAi && <Icon name="Bot" size={12} className="text-muted-foreground" />}
                  <span className={`text-xs font-semibold ${t.side === "long" ? "text-[#16C784]" : "text-[#EA3943]"}`}>
                    {t.side === "long" ? "Купил" : "Продал"} {name(t.coinId)} x{t.leverage}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {fmtPrice(t.entry, t.coinId)} → {fmtPrice(t.close, t.coinId)} · {REASON[t.reason] ?? t.reason} · {when(t.at)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`font-mono text-sm ${tone(t.pnl)}`}>{sgn(t.pnl)} USDT</div>
                <div className={`font-mono text-[10px] ${tone(t.pnl)}`}>{t.pct > 0 ? "+" : ""}{t.pct.toFixed(1).replace(".", ",")}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default TopTradesFeed;
