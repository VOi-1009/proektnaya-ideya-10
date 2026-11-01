import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { Coin, fmtPrice } from "@/lib/crypto";
import { Send, State, name, usd } from "./shared";

const riskOf = (l: number) =>
  l >= 75 ? { label: "Ва-банк!", color: "#EA3943", hsl: "355 85% 62%" }
  : l >= 40 ? { label: "Адреналин", color: "#F97316", hsl: "24 95% 55%" }
  : l >= 15 ? { label: "Жарко", color: "#FACC15", hsl: "48 96% 53%" }
  : l >= 4 ? { label: "Бодро", color: "#A3E635", hsl: "84 81% 55%" }
  : { label: "Спокойно", color: "#22C55E", hsl: "142 71% 45%" };

const LEVERAGE_MARKS = [1, 10, 25, 50, 75, 100];

interface Props {
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

const TradeForm = ({ coins, coinId, setCoinId, side, setSide, mode, setMode, limit, setLimit, margin, setMargin, leverage, setLeverage, sl, setSl, tp, setTp, m, livePrice, liqPrice, st, busy, submit, send }: Props) => {
  const { user } = useAuth();
  const risk = riskOf(leverage);
  const sideColor = side === "long" ? "#22C55E" : "#EA3943";
  const volume = m * leverage;

  return (
        <section className="rounded-xl border border-border bg-card p-3 space-y-2 lg:sticky lg:top-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <h3 className="font-display text-sm text-white flex items-center gap-2">
            <Icon name="Flame" size={15} className="text-primary" /> Новая сделка
            <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-accent flex items-center gap-1">USDT <span className="normal-case tracking-normal text-muted-foreground">(виртуальные)</span></span>
          </h3>
          <Select value={coinId} onValueChange={(v) => { setCoinId(v); setLimit(""); }}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {coins.filter((c) => !c.kind).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.symbol.toUpperCase()} · {name(c.id)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">Курс сейчас: <span className="text-accent font-mono">{livePrice ? fmtPrice(livePrice, coinId) : "—"}</span></div>

          <div className="grid grid-cols-2 gap-1.5">
            <Button size="sm" variant={side === "long" ? "default" : "outline"} onClick={() => setSide("long")} className={side === "long" ? "h-8 bg-[#22C55E] hover:bg-[#22C55E]/90 text-black shadow-[0_0_14px_rgba(34,197,94,0.45)]" : "h-8 border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/10 hover:text-[#22C55E]"}>
              <Icon name="TrendingUp" size={14} className="mr-1" /> Лонг
            </Button>
            <Button size="sm" variant={side === "short" ? "default" : "outline"} onClick={() => setSide("short")} className={side === "short" ? "h-8 bg-[#EA3943] hover:bg-[#EA3943]/90 text-white shadow-[0_0_14px_rgba(234,57,67,0.45)]" : "h-8 border-[#EA3943]/40 text-[#EA3943] hover:bg-[#EA3943]/10 hover:text-[#EA3943]"}>
              <Icon name="TrendingDown" size={14} className="mr-1" /> Шорт
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Button size="sm" className="h-7" variant={mode === "market" ? "secondary" : "ghost"} onClick={() => setMode("market")}>По рынку</Button>
            <Button size="sm" className="h-7" variant={mode === "limit" ? "secondary" : "ghost"} onClick={() => setMode("limit")}>Лимитный</Button>
          </div>

          {mode === "limit" && (
            <div>
              <label className="text-xs font-semibold text-accent">Ловим цену, $</label>
              <Input type="number" className="h-8 text-sm" value={limit} onChange={(e) => setLimit(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{side === "long" ? "Ждём просадку: лонг сработает, как только курс опустится до этой цены." : "Ждём отскок: шорт сработает, как только курс поднимется до этой цены."}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-accent flex items-center gap-1">Ставка, USDT <span className="font-normal text-muted-foreground">(виртуальные)</span></label>
            <div className="flex gap-1.5">
              <Input type="number" className="h-8 text-sm flex-1 min-w-0" value={margin} onChange={(e) => setMargin(e.target.value)} />
              <div className="flex gap-0.5">
              {[25, 50, 100].map((p) => (
                <Button key={p} size="sm" variant="ghost" className="h-8 px-1.5 text-xs" onClick={() => st && setMargin(String(Math.floor((st.balance * p) / 100)))}>{p}%</Button>
              ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold" style={{ color: risk.color }}>Плечо · {risk.label}</label>
              <span className="font-display text-base leading-none" style={{ color: risk.color, textShadow: `0 0 12px ${risk.color}66` }}>x{leverage}</span>
            </div>
            <Slider className="mt-1.5" style={{ "--primary": risk.hsl } as React.CSSProperties} min={1} max={100} step={1} value={[leverage]} onValueChange={(v) => setLeverage(v[0])} />
            <div className="flex justify-between mt-1">
              {LEVERAGE_MARKS.map((l) => (
                <button key={l} type="button" onClick={() => setLeverage(l)} className={`text-[10px] font-mono ${leverage === l ? "text-white" : "text-muted-foreground hover:text-white"}`}>
                  x{l}
                </button>
              ))}
            </div>
            {leverage >= 10 && (
              <p className="text-[11px] leading-snug mt-1 font-medium" style={{ color: risk.color }}>
                {leverage >= 75 ? "Ва-банк! Один неверный тик — и ставка сгорит: хватит движения против вас всего на " : leverage >= 40 ? "Кровь кипит: ликвидация уже при движении против вас на " : "Риск растёт: ликвидация при движении против вас на "}
                {(95 / leverage).toFixed(1)}%.
              </p>
            )}
          </div>

          {liqPrice > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-[#EA3943]/40 bg-[#EA3943]/10 px-2.5 py-1.5 text-xs">
              <span className="flex items-center gap-1.5 text-[#EA3943] font-semibold"><Icon name="Skull" size={14} fallback="Flame" /> Цена ликвидации</span>
              <span className="font-mono text-sm text-white">{fmtPrice(liqPrice, coinId)} <span className="text-[#EA3943]">({side === "long" ? "−" : "+"}{(95 / leverage).toFixed(1)}%)</span></span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-xs font-semibold text-[#EA3943]">Стоп-лосс, $</label>
              <Input type="number" className="h-8 text-sm" placeholder="не задан" value={sl} onChange={(e) => setSl(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#22C55E]">Тейк-профит, $</label>
              <Input type="number" className="h-8 text-sm" placeholder="не задан" value={tp} onChange={(e) => setTp(e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground -mt-0.5">{side === "long" ? "Лонг: стоп страхует ниже входа, тейк фиксирует прибыль выше." : "Шорт: стоп страхует выше входа, тейк фиксирует прибыль ниже."}</p>

          <div className="rounded-lg border px-2.5 py-1.5 text-xs" style={{ borderColor: `${risk.color}55`, background: `${risk.color}12` }}>
            <span className="text-muted-foreground">В игре на </span>
            <span className="font-mono text-sm font-semibold" style={{ color: risk.color }}>{usd(volume)}</span>
            {leverage > 1 && <span className="text-muted-foreground"> · ставка {usd(m)} умножена в {leverage} раз</span>}
            <div className="text-[10px] text-muted-foreground mt-0.5">Виртуальные USDT: реальные деньги не тратятся и не выигрываются.</div>
          </div>

          <Button
            className="w-full h-9 font-bold text-sm text-black hover:opacity-90"
            style={{ background: sideColor, color: side === "long" ? "#000" : "#fff", boxShadow: `0 0 18px ${sideColor}55` }}
            disabled={busy || !user || m < 1}
            onClick={submit}
          >
            {mode === "market" ? "Открыть позицию" : "Выставить ордер"}
          </Button>
        </section>
  );
};

export default TradeForm;
