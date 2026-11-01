import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fmtPrice } from "@/lib/crypto";
import { fundFmt, useAiPublic } from "@/lib/fund";
import { name } from "./shared";

const REASON: Record<string, string> = { stop: "стоп-лосс", take: "тейк-профит", manual: "вручную", liquidation: "ликвидация", time: "по времени" };
const tone = (v: number) => (v >= 0 ? "text-[#16C784]" : "text-[#EA3943]");
const sgn = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fundFmt(Math.abs(v))}`;
const when = (iso: string) => new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const Side = ({ side, lev }: { side: "long" | "short"; lev: number }) => (
  <span className={`text-xs font-semibold whitespace-nowrap ${side === "long" ? "text-[#16C784]" : "text-[#EA3943]"}`}>
    {side === "long" ? "Купила" : "Продала"} x{lev}
  </span>
);

const AiTraderCard = () => {
  const { token } = useAuth();
  const { data, isLoading } = useAiPublic(token);

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Icon name="Bot" size={16} className="text-primary" />
        <h3 className="font-display text-sm text-white">Сделки AiTKA</h3>
        {data && (
          <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${data.enabled ? "text-[#22C55E] border-[#22C55E]/40" : "text-muted-foreground border-border"}`}>
            {data.enabled ? "торгует" : "на паузе"}
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">виртуальные USDT</span>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-28 w-full bg-rail" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-rail/50 px-2.5 py-2">
              <div className="text-muted-foreground">Итог</div>
              <div className={`font-mono ${tone(data.pnl)}`}>{sgn(data.pnl)}</div>
              <div className={`font-mono text-[10px] ${tone(data.pnl)}`}>{data.pnlPct > 0 ? "+" : ""}{data.pnlPct.toFixed(2).replace(".", ",")}%</div>
            </div>
            <div className="rounded-lg bg-rail/50 px-2.5 py-2">
              <div className="text-muted-foreground">Сделок</div>
              <div className="font-mono text-white">{data.trades}</div>
            </div>
            <div className="rounded-lg bg-rail/50 px-2.5 py-2">
              <div className="text-muted-foreground">Прибыльных</div>
              <div className="font-mono text-white">{data.trades ? `${data.winRate.toFixed(0)}%` : "—"}</div>
            </div>
          </div>

          {data.open.length > 0 && (
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Сейчас в сделках</div>
              <div className="divide-y divide-border">
                {data.open.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <Side side={p.side} lev={p.leverage} />
                    <div className="min-w-0 flex-1">
                      <div className="text-white truncate">{name(p.coinId)}</div>
                      <div className="text-[10px] text-muted-foreground">по {fmtPrice(p.entry, p.coinId)} · сейчас {fmtPrice(p.price, p.coinId)}</div>
                    </div>
                    <span className={`font-mono text-xs ${tone(p.pnl)}`}>{sgn(p.pnl)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] text-muted-foreground mb-1">Закрытые сделки</div>
            {data.closed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {data.enabled ? "Сделок пока нет. AiTKA ждёт заметного движения на рынке." : "AiTKA пока не торгует."}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {data.closed.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <Side side={t.side} lev={t.leverage} />
                    <div className="min-w-0 flex-1">
                      <div className="text-white truncate">{name(t.coinId)}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {fmtPrice(t.entry, t.coinId)} → {fmtPrice(t.close, t.coinId)} · {REASON[t.reason] ?? t.reason} · {when(t.at)}
                      </div>
                    </div>
                    <span className={`font-mono text-xs ${tone(t.pnl)}`}>{sgn(t.pnl)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground leading-snug">
            Игра на виртуальных USDT: решения бота простые, по движению цены за сутки. Это не инвестиционная рекомендация.
          </p>
        </>
      )}
    </section>
  );
};

export default AiTraderCard;
