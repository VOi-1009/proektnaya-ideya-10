import VirtualNote from "./VirtualNote";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { fmtPrice } from "@/lib/crypto";
import LeadersBoard from "./LeadersBoard";
import { Leader, List, Row, Send, State, Tab, Trade, name, pct, reasonText, tone, usd } from "./shared";

interface Props {
  st: State | undefined;
  tab: Tab;
  setTab: (v: Tab) => void;
  busy: boolean;
  send: Send;
  shared: number[];
  share: (t: Trade) => void;
  leaders: Leader[];
  m: number;
  only?: Tab[];
}

const TradeTabs = ({ st, tab, setTab, busy, send, shared, share, leaders, m, only }: Props) => {
  const { user } = useAuth();

  return (
        <section className="rounded-xl border border-border bg-card p-4 min-w-0">
          <div className="flex gap-1 mb-3 flex-wrap">
            {([["positions", `Позиции${st?.positions.length ? ` (${st.positions.length})` : ""}`], ["orders", `Ордера${st?.orders.length ? ` (${st.orders.length})` : ""}`], ["history", "История"], ["leaders", "Рейтинг"]] as const).filter(([k]) => !only || only.includes(k)).map(([k, l]) => (
              <Button key={k} size="sm" variant={tab === k ? "secondary" : "ghost"} onClick={() => setTab(k)}>{l}</Button>
            ))}
          </div>

          {tab === "positions" && (
            <List empty="Открытых позиций нет. Откройте первую сделку справа.">
              {st?.positions.map((p) => (
                <Row key={p.id}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white">{name(p.coinId)} <span className={p.side === "long" ? "text-[#16C784]" : "text-[#EA3943]"}>{p.side === "long" ? "Лонг" : "Шорт"} x{p.leverage}</span></div>
                    <div className="text-xs text-muted-foreground">Вход {fmtPrice(p.entry, p.coinId)} · сейчас {fmtPrice(p.price, p.coinId)} · ликвидация {fmtPrice(p.liq, p.coinId)}{p.sl ? ` · стоп ${fmtPrice(p.sl, p.coinId)}` : ""}{p.tp ? ` · тейк ${fmtPrice(p.tp, p.coinId)}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm ${tone(p.pnl)}`}>PnL {usd(p.pnl, true)}</div>
                    <div className={`text-xs ${tone(p.pnl)}`}>{pct(p.pnl, p.margin)} · сумма {usd(p.margin)}</div>
                  </div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => send({ action: "close", id: p.id }, "Позиция закрыта")}>Закрыть</Button>
                </Row>
              ))}
            </List>
          )}

          {tab === "orders" && (
            <List empty="Лимитных ордеров нет.">
              {st?.orders.map((o) => (
                <Row key={o.id}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white">{name(o.coinId)} <span className={o.side === "long" ? "text-[#16C784]" : "text-[#EA3943]"}>{o.side === "long" ? "Лонг" : "Шорт"} x{o.leverage}</span></div>
                    <div className="text-xs text-muted-foreground">Исполнится по {fmtPrice(o.limit, o.coinId)} · сумма {usd(o.margin)}{o.sl ? ` · стоп ${fmtPrice(o.sl, o.coinId)}` : ""}{o.tp ? ` · тейк ${fmtPrice(o.tp, o.coinId)}` : ""}</div>
                  </div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => send({ action: "cancel", id: o.id }, "Ордер отменён")}>Отменить</Button>
                </Row>
              ))}
            </List>
          )}

          {tab === "history" && (
            <List empty="Закрытых сделок пока нет.">
              {st?.history.map((t) => (
                <Row key={t.id}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white">{name(t.coinId)} <span className={t.side === "long" ? "text-[#16C784]" : "text-[#EA3943]"}>{t.side === "long" ? "Лонг" : "Шорт"} x{t.leverage}</span></div>
                    <div className="text-xs text-muted-foreground">{fmtPrice(t.entry, t.coinId)} → {fmtPrice(t.close, t.coinId)} · {reasonText[t.reason] ?? t.reason} · {new Date(t.closedAt + "Z").toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm ${tone(t.pnl)}`}>PnL {usd(t.pnl, true)}</div>
                    <div className={`text-xs ${tone(t.pnl)}`}>{pct(t.pnl, t.margin)}</div>
                  </div>
                  {t.reason !== "reset" && (
                    <Button size="sm" variant="outline" disabled={shared.includes(t.id)} onClick={() => share(t)}>
                      {shared.includes(t.id) ? "Опубликовано" : "Поделиться"}
                    </Button>
                  )}
                </Row>
              ))}
            </List>
          )}

          {tab === "leaders" && (
            <>
          <VirtualNote className="mb-2">Суммы в рейтинге указаны в виртуальных USDT. Это результат учебной игры, а не реальной торговли.</VirtualNote>
          <LeadersBoard
            leaders={leaders}
            me={user?.id}
            busy={busy || m < 1}
            onRepeat={(t) => send({ action: "open", coinId: t.coinId, side: t.side, leverage: t.leverage, margin: m }, `Открыта такая же позиция на ${usd(m)}`)}
          />
          {user && <p className="text-xs text-muted-foreground mt-2">«Повторить сделку» открывает такую же позицию по текущему курсу на сумму из формы справа (сейчас {usd(m)}).</p>}
            </>
          )}
        </section>
  );
};

export default TradeTabs;
