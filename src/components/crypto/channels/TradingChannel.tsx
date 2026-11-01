import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { communityRequest } from "@/lib/community";
import { renderTradeCard } from "@/lib/tradeCard";
import CandleChart from "../CandleChart";
import { Coin, COIN_META, fmtPrice } from "@/lib/crypto";
import GuestCard from "../trading/GuestCard";
import TradeForm from "../trading/TradeForm";
import ExchangeCard from "../trading/ExchangeCard";
import FundCard from "../trading/FundCard";
import AiTraderCard from "../trading/AiTraderCard";
import TopTradesFeed from "../trading/TopTradesFeed";
import VirtualNote from "../trading/VirtualNote";
import { EX_DEFAULT, useExchangeSettings } from "@/lib/fund";
import TradeTabs from "../trading/TradeTabs";
import { Leader, State, Tab, Trade, TRADING_API, name, tone, usd } from "../trading/shared";

interface Props { coins: Coin[]; go?: (ch: string) => void }

const TradingChannel = ({ coins, go }: Props) => {
  const { user, token, ready, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const { data: exData } = useExchangeSettings(token);
  const exSettings = exData ?? EX_DEFAULT;
  const [coinId, setCoinId] = useState("bitcoin");
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(1);
  const [margin, setMargin] = useState("100");
  const [mode, setMode] = useState<"market" | "limit">("market");
  const [limit, setLimit] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("positions");

  const call = useCallback(async (method: string, query = "", body?: unknown) => {
    const r = await fetch(TRADING_API + query, {
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
    queryKey: ["trading-leaders", token],
    queryFn: () => call("GET", "?action=leaderboard"),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const myCap = Math.min(exSettings.maxLeverage, exSettings.myMaxLeverage ?? exSettings.maxLeverage);
  const locked = exSettings.lockedCoins ?? {};

  useEffect(() => {
    if (leverage > myCap) setLeverage(myCap);
  }, [myCap, leverage]);

  useEffect(() => {
    if (!exSettings.disabledCoins.includes(coinId) && !locked[coinId]) return;
    const next = coins.find((c) => !c.kind && !exSettings.disabledCoins.includes(c.id) && !locked[c.id]);
    if (next) setCoinId(next.id);
  }, [exSettings.disabledCoins, locked, coinId, coins]);

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
      qc.invalidateQueries({ queryKey: ["tka-wallet"] });
      qc.invalidateQueries({ queryKey: ["tka-fund"] });
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
    const text = `${t.pnl >= 0 ? "Закрыл в плюс" : "Закрыл в минус"} на тренировочной бирже: ${name(t.coinId)}, ${dir} x${t.leverage}. Вход ${fmtPrice(t.entry, t.coinId)} → выход ${fmtPrice(t.close, t.coinId)}. Результат: ${usd(t.pnl, true)} (виртуальные, ${((t.pnl / t.margin) * 100).toFixed(1)}% от суммы сделки).`;
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
      qc.invalidateQueries({ queryKey: ["tka-wallet"] });
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
  const entryRef = mode === "limit" && Number(limit) > 0 ? Number(limit) : livePrice;
  const liqPrice = entryRef > 0 ? (side === "long" ? entryRef * (1 - 0.95 / leverage) : entryRef * (1 + 0.95 / leverage)) : 0;

  if (ready && !user) {
    return <GuestCard setAuthOpen={setAuthOpen} />;
  }

  return (
    <div className="space-y-4 pb-4">
      <VirtualNote variant="banner" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <Stat label="Свободно" value={st ? usd(st.balance) : "—"} />
        <Stat label="В сделках" value={st ? usd(st.locked) : "—"} />
        <Stat label="Нереализ. PnL" value={st ? usd(st.unrealized, true) : "—"} cls={st ? tone(st.unrealized) : ""} />
        <Stat label="Общий PnL" value={st ? usd(st.equity - st.start, true) : "—"} sub={st ? `${((st.equity - st.start) / st.start * 100).toFixed(2)}% от старта` : ""} cls={st ? tone(st.equity - st.start) : ""} />
        <Stat label="Капитал" value={st ? usd(st.equity) : "—"} />
      </div>

      <div className="grid lg:grid-cols-[1fr_270px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
        <section className="rounded-xl border border-border bg-card p-4 min-w-0">
          <CandleChart
            coinId={coinId}
            price={livePrice}
            liqPrice={liqPrice}
            closeInfo={coinPositions.length ? `${usd(coinPnl, true)}${coinPositions.length > 1 ? ` · ${coinPositions.length} шт.` : ""}` : undefined}
            closeProfit={coinPnl >= 0}
            onCloseAll={closeAll}
            closeDisabled={busy}
            quickDisabled={busy || !user || m < 1 || !exSettings.enabled || exSettings.disabledCoins.includes(coinId) || !!locked[coinId]}
            quickInfo={`${usd(m)} · x${leverage}`}
            onQuick={(sd) => send({ action: "open", coinId, side: sd, leverage, margin: m, sl: Number(sl) || null, tp: Number(tp) || null }, "Позиция открыта")}
            lines={[
              ...(st?.positions.filter((p) => p.coinId === coinId).map((p) => ({ price: p.entry, label: `${p.side === "long" ? "Лонг" : "Шорт"} x${p.leverage}`, color: p.side === "long" ? "#16C784" : "#EA3943" })) ?? []),
              ...(st?.orders.filter((o) => o.coinId === coinId).map((o) => ({ price: o.limit, label: "Ордер", color: "hsl(var(--accent))" })) ?? []),
              ...(st?.positions.filter((p) => p.coinId === coinId && p.sl).map((p) => ({ price: p.sl as number, label: "Стоп-лосс", color: "#EA3943" })) ?? []),
              ...(st?.positions.filter((p) => p.coinId === coinId && p.tp).map((p) => ({ price: p.tp as number, label: "Тейк-профит", color: "#22C55E" })) ?? []),
              ...(st?.positions.filter((p) => p.coinId === coinId).map((p) => ({ price: p.liq, label: "Ликвидация", color: "#EA3943" })) ?? []),
              ...(liqPrice > 0 ? [{ price: liqPrice, label: "Ликвидация (черновик)", color: "#EA3943" }] : []),
              ...(Number(sl) > 0 ? [{ price: Number(sl), label: "Стоп (черновик)", color: "#EA3943" }] : []),
              ...(Number(tp) > 0 ? [{ price: Number(tp), label: "Тейк (черновик)", color: "#22C55E" }] : []),
            ]}
          />
        </section>

        <TradeTabs
          st={st}
          tab={tab}
          setTab={setTab}
          busy={busy}
          send={send}
          shared={shared}
          share={share}
          leaders={leaders?.leaders ?? []}
          m={m}
        />
        <TopTradesFeed />
        </div>
        <div className="space-y-4 min-w-0">
        <TradeForm
          coins={coins}
          coinId={coinId}
          setCoinId={setCoinId}
          side={side}
          setSide={setSide}
          mode={mode}
          setMode={setMode}
          limit={limit}
          setLimit={setLimit}
          margin={margin}
          setMargin={setMargin}
          leverage={leverage}
          setLeverage={setLeverage}
          sl={sl}
          setSl={setSl}
          tp={tp}
          setTp={setTp}
          m={m}
          livePrice={livePrice}
          liqPrice={liqPrice}
          st={st}
          busy={busy}
          submit={submit}
          send={send}
        />
        <ExchangeCard st={st} busy={busy} send={send} token={token} />
        <FundCard go={go} />
        <AiTraderCard />
        {go && (
          <button
            onClick={() => go("converter")}
            className="w-full flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-white hover:border-primary/50 hover:bg-hover/40 transition-colors"
          >
            <Icon name="Calculator" size={16} className="text-primary" />
            Калькуляторы
            <span className="ml-auto text-xs text-muted-foreground">размер позиции, ликвидация, прибыль</span>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
          </button>
        )}
        </div>

      </div>
      <p className="text-xs text-muted-foreground/70">Учебный режим: все деньги виртуальные, курсы реальные и обновляются раз в несколько секунд. Это не инвестиционная рекомендация.</p>
    </div>
  );
};

const Stat = ({ label, value, sub, cls = "" }: { label: string; value: string; sub?: string; cls?: string }) => (
  <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 min-w-0">
    <div className="text-[11px] leading-tight text-muted-foreground truncate">{label}</div>
    <div className="flex items-baseline gap-1.5 flex-wrap">
      <span className={`font-display text-sm sm:text-base leading-tight text-white ${cls}`}>{value}</span>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Виртуальные USDT" className="text-primary self-center">
              <Icon name="Info" size={12} />
            </button>
          </TooltipTrigger>
          <TooltipContent>виртуальные</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {sub && <span className={`text-[10px] leading-tight ${cls}`}>{sub}</span>}
    </div>
  </div>
);

export default TradingChannel;
