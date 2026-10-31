import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { communityRequest } from "@/lib/community";
import { renderTradeCard } from "@/lib/tradeCard";
import CandleChart from "../CandleChart";
import { Coin, COIN_META, fmtPrice } from "@/lib/crypto";
import func2url from "../../../../backend/func2url.json";

const URL = func2url.trading;
const LEVERAGE = [1, 2, 3, 5, 10, 20];

interface Position { id: number; coinId: string; side: "long" | "short"; leverage: number; margin: number; size: number; entry: number; price: number; pnl: number; liq: number; sl: number | null; tp: number | null }
interface Order { id: number; coinId: string; side: "long" | "short"; leverage: number; margin: number; limit: number; sl: number | null; tp: number | null }
interface Trade { id: number; coinId: string; side: "long" | "short"; leverage: number; margin: number; entry: number; close: number; pnl: number; reason: string; closedAt: string }
interface Stats { trades: number; winRate: number; avgPnl: number; avgPct: number; best: number; bestPct: number; worst: number; worstPct: number; totalPnl: number; curve: { t: string; v: number }[] }
interface State { stats?: Stats; balance: number; equity: number; locked: number; unrealized: number; resets: number; start: number; positions: Position[]; orders: Order[]; history: Trade[]; prices: Record<string, number> }
interface Leader { pnl?: number; userId: number; name: string; avatar: string; equity: number; profitPct: number; trades: number }

const usd = (v: number, sign = false) => `${sign && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const pct = (pnl: number, base: number) => `${pnl > 0 ? "+" : ""}${base ? ((pnl / base) * 100).toFixed(1) : "0.0"}%`;
const tone = (v: number) => (v >= 0 ? "text-[#16C784]" : "text-[#EA3943]");
const name = (id: string) => COIN_META[id]?.ru ?? id;
const reasonText: Record<string, string> = { stop: "Стоп-лосс", take: "Тейк-профит", manual: "Закрыта вручную", liquidation: "Ликвидация", reset: "Сброс счёта" };

interface Props { coins: Coin[] }

const TradingChannel = ({ coins }: Props) => {
  const { user, token, ready, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const [coinId, setCoinId] = useState("bitcoin");
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(1);
  const [margin, setMargin] = useState("1000");
  const [mode, setMode] = useState<"market" | "limit">("market");
  const [limit, setLimit] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"positions" | "orders" | "history" | "leaders">("positions");

  const call = useCallback(async (method: string, query = "", body?: unknown) => {
    const r = await fetch(URL + query, {
      method,
      headers: { "Content-Type": "application/json", "X-Auth-Token": token ?? "" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
    return data;
  }, [token]);

  const { data: st } = useQuery<State>({
    queryKey: ["trading", token],
    queryFn: () => call("GET"),
    enabled: !!token,
    refetchInterval: 20_000,
  });
  const { data: leaders } = useQuery<{ leaders: Leader[] }>({
    queryKey: ["trading-leaders"],
    queryFn: () => call("GET", "?action=leaderboard"),
    refetchInterval: 60_000,
  });

  const livePrice = st?.prices[coinId] ?? coins.find((c) => c.id === coinId)?.current_price ?? 0;

  useEffect(() => {
    if (mode === "limit" && !limit && livePrice) setLimit(String(livePrice));
  }, [mode, livePrice, limit]);

  const send = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      const data = await call("POST", "", body);
      qc.setQueryData(["trading", token], data);
      qc.invalidateQueries({ queryKey: ["trading-leaders"] });
      toast({ title: ok });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const [shared, setShared] = useState<number[]>([]);
  const share = async (t: Trade) => {
    const dir = t.side === "long" ? "Лонг" : "Шорт";
    const text = `${t.pnl >= 0 ? "Закрыл в плюс" : "Закрыл в минус"} на тренировочной бирже: ${name(t.coinId)}, ${dir} x${t.leverage}. Вход ${fmtPrice(t.entry, t.coinId)} → выход ${fmtPrice(t.close, t.coinId)}. Результат: ${usd(t.pnl, true)} (${((t.pnl / t.margin) * 100).toFixed(1)}% от суммы сделки).`;
    try {
      let image: string | undefined;
      try {
        image = renderTradeCard({
          coinName: name(t.coinId),
          coinShort: COIN_META[t.coinId]?.short ?? t.coinId.slice(0, 4).toUpperCase(),
          coinColor: COIN_META[t.coinId]?.color ?? "#F97316",
          side: t.side,
          leverage: t.leverage,
          entry: fmtPrice(t.entry, t.coinId),
          close: fmtPrice(t.close, t.coinId),
          pct: (t.pnl / t.margin) * 100,
          pnl: usd(t.pnl, true),
          date: new Date(t.closedAt + "Z").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
        });
      } catch {
        image = undefined;
      }
      await communityRequest(token, "", { action: "post", body: text, sentiment: t.side === "long" ? "bull" : "bear", coins: [t.coinId], image, contentType: image ? "image/png" : undefined });
      setShared((a) => [...a, t.id]);
      toast({ title: "Сделка опубликована в соцсети сайта" });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const closeAll = async () => {
    const list = st?.positions.filter((p) => p.coinId === coinId) ?? [];
    if (!list.length) return;
    setBusy(true);
    try {
      let data: State | undefined;
      for (const p of list) data = await call("POST", "", { action: "close", id: p.id });
      if (data) qc.setQueryData(["trading", token], data);
      qc.invalidateQueries({ queryKey: ["trading-leaders"] });
      toast({ title: list.length > 1 ? "Позиции закрыты" : "Позиция закрыта" });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const coinPositions = st?.positions.filter((p) => p.coinId === coinId) ?? [];
  const coinPnl = coinPositions.reduce((a, p) => a + p.pnl, 0);

  const submit = () =>
    send(
      { action: mode === "market" ? "open" : "limit", coinId, side, leverage, margin: Number(margin), limit: Number(limit), sl: Number(sl) || null, tp: Number(tp) || null },
      mode === "market" ? "Позиция открыта" : "Лимитный ордер выставлен",
    );

  const m = Number(margin) || 0;
  const volume = m * leverage;

  if (ready && !user) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <Icon name="LineChart" size={32} className="mx-auto text-primary" />
        <h2 className="font-display text-lg text-white">Тренировочная биржа</h2>
        <p className="text-sm text-muted-foreground">Торгуйте на виртуальные 10 000 $ по реальным курсам и соревнуйтесь с другими трейдерами. Для этого нужно войти.</p>
        <Button onClick={() => setAuthOpen(true)}>Войти или зарегистрироваться</Button>
        <Board leaders={leaders?.leaders ?? []} me={undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Свободно" value={st ? usd(st.balance) : "—"} />
        <Stat label="В сделках" value={st ? usd(st.locked) : "—"} />
        <Stat label="Нереализ. PnL" value={st ? usd(st.unrealized, true) : "—"} cls={st ? tone(st.unrealized) : ""} />
        <Stat label="Общий PnL" value={st ? usd(st.equity - st.start, true) : "—"} sub={st ? `${((st.equity - st.start) / st.start * 100).toFixed(2)}% от старта` : ""} cls={st ? tone(st.equity - st.start) : ""} />
        <Stat label="Капитал" value={st ? usd(st.equity) : "—"} />
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        <section className="rounded-xl border border-border bg-card p-4 space-y-3 h-fit">
          <h3 className="font-display text-white">Новая сделка</h3>
          <Select value={coinId} onValueChange={(v) => { setCoinId(v); setLimit(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {coins.filter((c) => !c.kind).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.symbol.toUpperCase()} · {name(c.id)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">Курс сейчас: <span className="text-white">{livePrice ? fmtPrice(livePrice, coinId) : "—"}</span></div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant={side === "long" ? "default" : "outline"} onClick={() => setSide("long")} className={side === "long" ? "bg-[#16C784] hover:bg-[#16C784]/90 text-black" : ""}>Лонг</Button>
            <Button variant={side === "short" ? "default" : "outline"} onClick={() => setSide("short")} className={side === "short" ? "bg-[#EA3943] hover:bg-[#EA3943]/90 text-white" : ""}>Шорт</Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant={mode === "market" ? "secondary" : "ghost"} onClick={() => setMode("market")}>По рынку</Button>
            <Button size="sm" variant={mode === "limit" ? "secondary" : "ghost"} onClick={() => setMode("limit")}>Лимитный</Button>
          </div>

          {mode === "limit" && (
            <div>
              <label className="text-xs text-muted-foreground">Цена исполнения, $</label>
              <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{side === "long" ? "Лонг откроется, когда курс опустится до этой цены." : "Шорт откроется, когда курс поднимется до этой цены."}</p>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground">Своя сумма, $</label>
            <Input type="number" value={margin} onChange={(e) => setMargin(e.target.value)} />
            <div className="flex gap-1 mt-1">
              {[25, 50, 100].map((p) => (
                <Button key={p} size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => st && setMargin(String(Math.floor((st.balance * p) / 100)))}>{p}%</Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Плечо</label>
            <div className="flex gap-1 flex-wrap">
              {LEVERAGE.map((l) => (
                <Button key={l} size="sm" variant={leverage === l ? "secondary" : "outline"} className="h-8 px-3" onClick={() => setLeverage(l)}>x{l}</Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Стоп-лосс, $</label>
              <Input type="number" placeholder="не задан" value={sl} onChange={(e) => setSl(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Тейк-профит, $</label>
              <Input type="number" placeholder="не задан" value={tp} onChange={(e) => setTp(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">{side === "long" ? "Для лонга: стоп ниже цены входа, тейк выше." : "Для шорта: стоп выше цены входа, тейк ниже."}</p>

          <div className="text-xs text-muted-foreground">Объём позиции: <span className="text-white">{usd(volume)}</span>{leverage > 1 && " · при сильном движении против вас позиция будет ликвидирована"}</div>

          <Button className="w-full" disabled={busy || !user || m < 10} onClick={submit}>
            {mode === "market" ? "Открыть позицию" : "Выставить ордер"}
          </Button>
          {st && (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled={busy} onClick={() => confirm("Сбросить счёт к 10 000 $? Все позиции и ордера будут закрыты.") && send({ action: "reset" }, "Счёт сброшен")}>
              Сбросить счёт к 10 000 $
            </Button>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 min-w-0">
          <CandleChart
            coinId={coinId}
            price={livePrice}
            closeInfo={coinPositions.length ? `${usd(coinPnl, true)}${coinPositions.length > 1 ? ` · ${coinPositions.length} шт.` : ""}` : undefined}
            closeProfit={coinPnl >= 0}
            onCloseAll={closeAll}
            closeDisabled={busy}
            quickDisabled={busy || !user || m < 10}
            quickInfo={`${usd(m)} · x${leverage}`}
            onQuick={(sd) => send({ action: "open", coinId, side: sd, leverage, margin: m, sl: Number(sl) || null, tp: Number(tp) || null }, "Позиция открыта")}
            lines={[
              ...(st?.positions.filter((p) => p.coinId === coinId).map((p) => ({ price: p.entry, label: `${p.side === "long" ? "Лонг" : "Шорт"} x${p.leverage}`, color: p.side === "long" ? "#16C784" : "#EA3943" })) ?? []),
              ...(st?.orders.filter((o) => o.coinId === coinId).map((o) => ({ price: o.limit, label: "Ордер", color: "hsl(var(--accent))" })) ?? []),
              ...(st?.positions.filter((p) => p.coinId === coinId && p.sl).map((p) => ({ price: p.sl as number, label: "Стоп-лосс", color: "#EA3943" })) ?? []),
              ...(st?.positions.filter((p) => p.coinId === coinId && p.tp).map((p) => ({ price: p.tp as number, label: "Тейк-профит", color: "#22C55E" })) ?? []),
              ...(Number(sl) > 0 ? [{ price: Number(sl), label: "Стоп (черновик)", color: "#EA3943" }] : []),
              ...(Number(tp) > 0 ? [{ price: Number(tp), label: "Тейк (черновик)", color: "#22C55E" }] : []),
            ]}
          />
        </section>
      </div>

        <section className="rounded-xl border border-border bg-card p-4 min-w-0">
          <div className="flex gap-1 mb-3 flex-wrap">
            {([["positions", `Позиции${st?.positions.length ? ` (${st.positions.length})` : ""}`], ["orders", `Ордера${st?.orders.length ? ` (${st.orders.length})` : ""}`], ["history", "История"], ["leaders", "Рейтинг"]] as const).map(([k, l]) => (
              <Button key={k} size="sm" variant={tab === k ? "secondary" : "ghost"} onClick={() => setTab(k)}>{l}</Button>
            ))}
          </div>

          {tab === "positions" && (
            <List empty="Открытых позиций нет. Откройте первую сделку слева.">
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
          <Board
            leaders={leaders?.leaders ?? []}
            me={user?.id}
            busy={busy || m < 10}
            onRepeat={(t) => send({ action: "open", coinId: t.coinId, side: t.side, leverage: t.leverage, margin: m }, `Открыта такая же позиция на ${usd(m)}`)}
          />
          {user && <p className="text-xs text-muted-foreground mt-2">«Повторить сделку» открывает такую же позицию по текущему курсу на сумму из формы слева (сейчас {usd(m)}).</p>}
            </>
          )}
        </section>
      <p className="text-xs text-muted-foreground/70">Учебный режим: все деньги виртуальные, курсы реальные и обновляются раз в несколько секунд. Это не инвестиционная рекомендация.</p>
    </div>
  );
};

const Stat = ({ label, value, sub, cls = "" }: { label: string; value: string; sub?: string; cls?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`font-display text-base sm:text-lg text-white ${cls}`}>{value}</div>
    {sub && <div className={`text-xs ${cls}`}>{sub}</div>}
  </div>
);

const List = ({ children, empty }: { children: React.ReactNode; empty: string }) => {
  const items = Array.isArray(children) ? children : children ? [children] : [];
  return items.length ? <div className="divide-y divide-border">{children}</div> : <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>;
};

const Row = ({ children }: { children: React.ReactNode }) => <div className="flex items-center gap-3 py-2.5">{children}</div>;

interface PubTrade { id: number; coinId: string; side: "long" | "short"; leverage: number; entry: number; price: number; pct: number; open: boolean; at: string }

const LeaderTrades = ({ userId, onRepeat, busy }: { userId: number; onRepeat?: (t: PubTrade) => void; busy?: boolean }) => {
  const { data, isLoading } = useQuery<{ trades: PubTrade[] }>({
    queryKey: ["trading-trades", userId],
    queryFn: async () => {
      const r = await fetch(`${URL}?action=trades&userId=${userId}`);
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

const Board = ({ leaders, me, onRepeat, busy }: { leaders: Leader[]; me?: number; onRepeat?: (t: PubTrade) => void; busy?: boolean }) => {
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

export default TradingChannel;