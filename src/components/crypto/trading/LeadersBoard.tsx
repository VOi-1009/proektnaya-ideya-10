import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { fmtPrice } from "@/lib/crypto";
import { Leader, PubTrade, Row, TRADING_API, name, tone, usd } from "./shared";

const LeaderTrades = ({ userId, onRepeat, busy }: { userId: number; onRepeat?: (t: PubTrade) => void; busy?: boolean }) => {
  const { token } = useAuth();
  const { data, isLoading } = useQuery<{ trades: PubTrade[] }>({
    queryKey: ["trading-trades", userId, !!token],
    enabled: !!token,
    queryFn: async () => {
      const r = await fetch(`${TRADING_API}?action=trades&userId=${userId}`, { headers: { "X-Auth-Token": token ?? "" } });
      if (!r.ok) throw new Error("bad");
      return r.json();
    },
    staleTime: 20_000,
  });
  if (isLoading) return <p className="text-xs text-muted-foreground py-2 pl-9">Загружаю сделки…</p>;
  if (!data?.trades.length) return <p className="text-xs text-muted-foreground py-2 pl-9">У трейдера пока нет сделок.</p>;
  return (
    <div className="pl-9 pb-2 space-y-1.5">
      {data.trades.map((t) => (
        <div key={`${t.open ? "o" : "c"}${t.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-rail/40 px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white">
              {name(t.coinId)} <span className={t.side === "long" ? "text-[#22C55E]" : "text-[#EA3943]"}>{t.side === "long" ? "Лонг" : "Шорт"} x{t.leverage}</span>
              <span className="ml-2 text-xs text-muted-foreground">{t.open ? "открыта" : "закрыта"}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Вход {fmtPrice(t.entry, t.coinId)} · {t.open ? "сейчас" : "выход"} {fmtPrice(t.price, t.coinId)}
            </div>
          </div>
          <div className={`text-sm ${tone(t.pct)}`}>{t.pct > 0 ? "+" : ""}{t.pct.toFixed(1)}%</div>
          {onRepeat && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onRepeat(t)}>
              Повторить сделку
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

interface Props { leaders: Leader[]; me?: number; onRepeat?: (t: PubTrade) => void; busy?: boolean }

const LeadersBoard = ({ leaders, me, onRepeat, busy }: Props) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
  <div className="text-left">
    {leaders.length === 0 ? (
      <p className="text-sm text-muted-foreground py-6 text-center">Рейтинг пока пуст. Станьте первым.</p>
    ) : (
      <div className="divide-y divide-border">
        {leaders.map((l, i) => (
          <div key={l.userId}>
            <button type="button" className="w-full text-left hover:bg-hover/40 rounded" onClick={() => setOpen(open === l.userId ? null : l.userId)}>
              <Row>
                <div className="w-6 text-sm text-muted-foreground">{i + 1}</div>
                <div className={`flex-1 text-sm truncate ${l.userId === me ? "text-primary" : "text-white"}`}>{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.trades} сделок</div>
                <div className="text-right">
                  <div className="text-sm text-white">{usd(l.equity)}</div>
                  {l.pnl !== undefined && <div className={`text-xs ${tone(l.pnl)}`}>PnL {usd(l.pnl, true)}</div>}
                  <div className={`text-xs ${tone(l.profitPct)}`}>{l.profitPct > 0 ? "+" : ""}{l.profitPct.toFixed(2)}%</div>
                </div>
                <Icon name={open === l.userId ? "ChevronUp" : "ChevronDown"} size={16} className="text-muted-foreground" />
              </Row>
            </button>
            {open === l.userId && <LeaderTrades userId={l.userId} onRepeat={l.userId === me ? undefined : onRepeat} busy={busy} />}
          </div>
        ))}
      </div>
    )}
  </div>
  );
};

export default LeadersBoard;
