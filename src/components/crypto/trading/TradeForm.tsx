import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { Coin, fmtPrice, isListed } from "@/lib/crypto";
import OrderBook from "./OrderBook";
import { EX_DEFAULT, tradeFee, useExchangeSettings } from "@/lib/fund";
import { useState } from "react";
import { useListings } from "@/lib/listings";
import { Send, State, name, usd } from "./shared";

const riskOf = (l: number) =>
  l >= 75 ? { label: "Ва-банк!", color: "#EA3943", hsl: "355 85% 62%" }
  : l >= 40 ? { label: "Адреналин", color: "#F97316", hsl: "24 95% 55%" }
  : l >= 15 ? { label: "Жарко", color: "#FACC15", hsl: "48 96% 53%" }
  : l >= 4 ? { label: "Бодро", color: "#A3E635", hsl: "84 81% 55%" }
  : { label: "Спокойно", color: "#22C55E", hsl: "142 71% 45%" };

const LEVERAGE_MARKS = [1, 10, 25, 50, 75, 100];

interface Props {
  stacked?: boolean;
  coins: Coin[];
  coinId: string;
  setCoinId: (v: string) => void;
  side: "long" | "short";
  setSide: (v: "long" | "short") => void;
  mode: "market" | "limit";
  setMode: (v: "market" | "limit") => void;
  limit: string;
  setLimit: (v: string) => void;
  margin: string;
  setMargin: (v: string) => void;
  leverage: number;
  setLeverage: (v: number) => void;
  sl: string;
  setSl: (v: string) => void;
  tp: string;
  setTp: (v: string) => void;
  m: number;
  livePrice: number;
  liqPrice: number;
  st: State | undefined;
  busy: boolean;
  submit: () => void;
  send: Send;
}

const TradeForm = ({ stacked, coins, coinId, setCoinId, side, setSide, mode, setMode, limit, setLimit, margin, setMargin, leverage, setLeverage, sl, setSl, tp, setTp, m, livePrice, liqPrice, st, busy, submit, send }: Props) => {
  const { user, token } = useAuth();
  const { data: exData } = useExchangeSettings(token);
  const ex = exData ?? EX_DEFAULT;
  const fee = tradeFee(ex, m, leverage);
  const listedCfg = ex.listed?.[coinId];
  const cap = Math.min(ex.maxLeverage, ex.myMaxLeverage ?? ex.maxLeverage, listedCfg?.maxLeverage ?? 1000);
  const lockedCoins = ex.lockedCoins ?? {};
  const titles = ex.titles ?? [];
  const nextTier = (ex.levelRules && ex.leverageTiers ? ex.leverageTiers : []).find(([, lev]) => lev > cap);
  const blocked = !ex.enabled || ex.disabledCoins.includes(coinId) || !!lockedCoins[coinId] || !!listedCfg?.halted || (!!listedCfg && !listedCfg.allowShort && side === "short");
  const risk = riskOf(leverage);
  const sideColor = side === "long" ? "#22C55E" : "#EA3943";
  const volume = m * leverage;

  const [more, setMore] = useState(false);
  const listed = isListed(coinId);
  const { data: lst } = useListings();
  const fr = lst?.items.find((x) => x.slug === coinId)?.fundingRate ?? 0;

  return (
    <div className={`grid gap-2 items-stretch ${stacked ? "grid-cols-1" : "grid-cols-[1.2fr_1fr]"}`}>
      <section className="rounded-xl border border-border bg-card p-2.5 space-y-2 min-w-0">
        <Select value={coinId} onValueChange={(v) => { setCoinId(v); setLimit(""); }}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {coins.filter((c) => !c.kind && !ex.disabledCoins.includes(c.id)).map((c) => (
              <SelectItem key={c.id} value={c.id} disabled={!!lockedCoins[c.id] || !!ex.listed?.[c.id]?.halted}>
                {c.symbol.toUpperCase()} · {c.listing ? c.name : name(c.id)}{c.listing ? " · NEW" : ""}
                {ex.listed?.[c.id]?.halted ? " · торги остановлены" : lockedCoins[c.id] ? ` · со статуса «${titles[lockedCoins[c.id] - 1] ?? lockedCoins[c.id]}»` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Курс</span>
          <span className="text-accent font-mono">{livePrice ? fmtPrice(livePrice, coinId) : "—"}</span>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <Button size="sm" onClick={() => setSide("long")} className={`h-8 ${side === "long" ? "bg-[#22C55E] hover:bg-[#22C55E]/90 text-black" : "bg-rail text-[#22C55E] hover:bg-rail"}`}>Лонг</Button>
          <Button size="sm" onClick={() => setSide("short")} className={`h-8 ${side === "short" ? "bg-[#EA3943] hover:bg-[#EA3943]/90 text-white" : "bg-rail text-[#EA3943] hover:bg-rail"}`}>Шорт</Button>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <Button size="sm" className="h-7 text-xs" variant={mode === "market" ? "secondary" : "ghost"} onClick={() => setMode("market")}>Рынок</Button>
          <Button size="sm" className="h-7 text-xs" variant={mode === "limit" ? "secondary" : "ghost"} onClick={() => setMode("limit")}>Лимит</Button>
        </div>

        {mode === "limit" && (
          <Input type="number" className="h-8 text-sm" placeholder="Цена, $" value={limit} onChange={(e) => setLimit(e.target.value)} />
        )}

        <div className="space-y-1">
          <Input type="number" className="h-8 text-sm" placeholder="Ставка, USDT" value={margin} onChange={(e) => setMargin(e.target.value)} />
          <div className="grid grid-cols-3 gap-1">
            {[25, 50, 100].map((p) => (
              <Button key={p} size="sm" variant="ghost" className="h-6 px-1 text-[11px] bg-rail/60" onClick={() => st && setMargin(String(Math.floor((st.balance * p) / 100)))}>{p}%</Button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold" style={{ color: risk.color }}>Плечо</span>
            <span className="font-display text-sm leading-none" style={{ color: risk.color }}>x{leverage}</span>
          </div>
          <Slider className="mt-1.5" style={{ "--primary": risk.hsl } as React.CSSProperties} min={1} max={cap} step={1} value={[Math.min(leverage, cap)]} onValueChange={(v) => setLeverage(v[0])} />
        </div>

        <button type="button" onClick={() => setMore((v) => !v)} className="w-full flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Стоп и тейк</span>
          <Icon name={more ? "ChevronUp" : "ChevronDown"} size={13} />
        </button>
        {more && (
          <div className="grid grid-cols-2 gap-1">
            <Input type="number" className="h-8 text-xs" placeholder="Стоп, $" value={sl} onChange={(e) => setSl(e.target.value)} />
            <Input type="number" className="h-8 text-xs" placeholder="Тейк, $" value={tp} onChange={(e) => setTp(e.target.value)} />
          </div>
        )}

        {liqPrice > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#EA3943]">Ликвидация</span>
            <span className="font-mono text-white">{fmtPrice(liqPrice, coinId)}</span>
          </div>
        )}
        {ex.feePercent > 0 && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Комиссия {String(ex.feePercent).replace(".", ",")}%</span>
            <span className="font-mono text-white">{usd(fee)}</span>
          </div>
        )}
        {fr !== 0 && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Финансирование</span>
            <span className="font-mono text-white">{fr > 0 ? "+" : ""}{String(fr).replace(".", ",")}% / 8ч</span>
          </div>
        )}
        {!ex.enabled && <div className="rounded-lg border border-[#EA3943]/40 bg-[#EA3943]/10 px-2 py-1 text-[11px] text-foreground">{ex.message || "Новые сделки временно приостановлены."}</div>}
        {ex.enabled && ex.disabledCoins.includes(coinId) && <div className="rounded-lg border border-[#EA3943]/40 bg-[#EA3943]/10 px-2 py-1 text-[11px] text-foreground">Торговля этой монетой отключена.</div>}
        {listedCfg?.premarket && <div className="text-[10px] leading-snug text-primary">Премаркет: токен ещё не вышел на биржи, цена может сильно меняться.</div>}
        {listedCfg && <div className="text-[10px] leading-snug text-muted-foreground">Новая монета: плечо до x{listedCfg.maxLeverage}, ставка от {listedCfg.minMargin}{listedCfg.maxMargin ? ` до ${listedCfg.maxMargin}` : ""} USDT{!listedCfg.allowShort ? ", шорт недоступен" : ""}.</div>}

        <Button
          className="w-full h-9 font-bold text-sm hover:opacity-90"
          style={{ background: sideColor, color: side === "long" ? "#000" : "#fff" }}
          disabled={busy || !user || m < ex.minMargin || blocked}
          onClick={submit}
        >
          {mode === "market" ? (side === "long" ? "Купить / Лонг" : "Продать / Шорт") : "Выставить ордер"}
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-2.5 min-w-0 flex flex-col">
        <h3 className="font-display text-sm text-white mb-2">Стакан</h3>
        {listed ? (
          <OrderBook slug={coinId} compact />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-xs text-muted-foreground px-2">Стакан подключается</div>
        )}
      </section>
    </div>
  );
};

export default TradeForm;
