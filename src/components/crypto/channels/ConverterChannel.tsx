import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Coin, COIN_META, fmtPrice, fmtRub, isFx } from "@/lib/crypto";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Message from "../Message";
import PivotCalc from "../calc/PivotCalc";
import FibCalc from "../calc/FibCalc";
import PositionSizeCalc from "../calc/PositionSizeCalc";
import PnlCalc from "../calc/PnlCalc";
import AverageCalc from "../calc/AverageCalc";
import LiqCalc from "../calc/LiqCalc";
import RiskRewardCalc from "../calc/RiskRewardCalc";

const TOOLS = [
  { id: "convert", label: "Конвертер", icon: "ArrowLeftRight", hint: "Пересчёт монет и валют" },
  { id: "pivot", label: "Пивоты", icon: "Layers", hint: "Уровни поддержки и сопротивления" },
  { id: "fib", label: "Фибоначчи", icon: "Spline", hint: "Коррекция и цели" },
  { id: "size", label: "Размер позиции", icon: "Scale", hint: "Сколько купить при заданном риске" },
  { id: "pnl", label: "Прибыль / убыток", icon: "Calculator", hint: "Результат сделки с плечом и комиссией" },
  { id: "avg", label: "Усреднение", icon: "Combine", hint: "Средняя цена по нескольким покупкам" },
  { id: "liq", label: "Ликвидация", icon: "Skull", hint: "Цена, при которой позиция сгорит" },
  { id: "rr", label: "Риск / прибыль", icon: "Target", hint: "Соотношение стопа и тейка" },
] as const;

type ToolId = (typeof TOOLS)[number]["id"];

const FIAT: Record<string, { label: string; name: string }> = {
  rub: { label: "RUB", name: "Российский рубль" },
  usd: { label: "USD", name: "Доллар США" },
  eur: { label: "EUR", name: "Евро" },
};

const ConverterChannel = ({ coins }: { coins: Coin[] }) => {
  const [tool, setTool] = useState<ToolId>("convert");
  const [from, setFrom] = useState("bitcoin");
  const [to, setTo] = useState("rub");
  const [amount, setAmount] = useState("1");

  const usdRub = coins.find((c) => c.id === "usd-rub")?.current_price ?? 0;
  const eurRub = coins.find((c) => c.id === "eur-rub")?.current_price ?? 0;

  const priceUsd = (id: string) => {
    if (id === "usd") return 1;
    if (id === "rub") return usdRub ? 1 / usdRub : 0;
    if (id === "eur") return usdRub && eurRub ? eurRub / usdRub : 0;
    return coins.find((c) => c.id === id)?.current_price ?? 0;
  };
  const label = (id: string) => FIAT[id]?.label ?? COIN_META[id]?.short ?? id;

  const result = useMemo(() => {
    const a = parseFloat(amount.replace(",", "."));
    if (Number.isNaN(a) || a < 0) return null;
    const p2 = priceUsd(to);
    if (!p2) return null;
    return (a * priceUsd(from)) / p2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, from, to, coins]);

  const invalid = amount !== "" && result === null;
  const options = [
    ...Object.entries(FIAT).map(([id, f]) => ({ id, name: f.name })),
    ...coins.filter((c) => !isFx(c.id)).map((c) => ({ id: c.id, name: COIN_META[c.id]?.ru ?? c.name })),
  ];

  const fmtResult = (v: number) => v.toLocaleString("ru-RU", { maximumFractionDigits: v >= 1000 ? 2 : v >= 1 ? 4 : 8 });
  const amt = parseFloat(amount.replace(",", "."));
  const rubValue = !Number.isNaN(amt) && usdRub ? amt * priceUsd(from) * usdRub : null;

  const picker = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px] bg-rail border-0 h-auto font-coin">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id} className="font-coin">
            {label(o.id)} · {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const active = TOOLS.find((t) => t.id === tool)!;

  const switcher = (
    <div className="flex flex-wrap gap-1.5">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTool(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors ${
            tool === t.id ? "bg-primary text-primary-foreground border-primary font-semibold" : "bg-card border-border text-muted-foreground hover:text-white hover:bg-hover/60"
          }`}
        >
          <Icon name={t.icon} size={14} fallback="Calculator" />
          {t.label}
        </button>
      ))}
    </div>
  );

  if (tool !== "convert") {
    return (
      <div className="space-y-3">
        {switcher}
        <p className="text-muted-foreground text-sm">{active.hint}.</p>
        {tool === "pivot" && <PivotCalc />}
        {tool === "fib" && <FibCalc />}
        {tool === "size" && <PositionSizeCalc coins={coins} />}
        {tool === "pnl" && <PnlCalc coins={coins} />}
        {tool === "avg" && <AverageCalc />}
        {tool === "liq" && <LiqCalc coins={coins} />}
        {tool === "rr" && <RiskRewardCalc coins={coins} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {switcher}
      <Message author="Traderka Бот" time="Сегодня" icon="ArrowLeftRight" bot>
        <p className="text-muted-foreground mb-3">
          Пересчёт между монетами, золотом, нефтью, рублём, долларом и евро по текущему курсу.
        </p>
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className={`bg-rail rounded px-3 py-2.5 font-mono text-lg text-white outline-none border ${
                invalid ? "border-down" : "border-transparent focus:border-primary"
              }`}
              placeholder="0"
            />
            {picker(from, setFrom)}
          </div>
          {invalid && <div className="text-down text-xs">Введите положительное число</div>}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              className="w-9 h-9 rounded-full bg-hover hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
              aria-label="Поменять местами"
            >
              <Icon name="ArrowUpDown" size={16} />
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="bg-rail rounded px-3 py-2.5 font-mono text-lg text-primary tabular truncate">
              {result !== null ? fmtResult(result) : "—"}
            </div>
            {picker(to, setTo)}
          </div>
          <div className="text-xs text-muted-foreground font-mono space-y-0.5">
            <div>
              1 {label(from)} ={" "}
              {to === "usd"
                ? fmtPrice(priceUsd(from))
                : to === "rub"
                  ? fmtRub(priceUsd(from) * usdRub)
                  : `${fmtResult(priceUsd(from) / (priceUsd(to) || 1))} ${label(to)}`}
            </div>
            {to !== "rub" && from !== "rub" && rubValue !== null && (
              <div>
                В рублях: <span className="text-white">{fmtRub(rubValue)}</span>
              </div>
            )}
            {usdRub > 0 && (
              <div className="text-muted-foreground/70">
                Курс: 1 USD = {fmtRub(usdRub)}
                {eurRub > 0 && ` · 1 EUR = ${fmtRub(eurRub)}`}
              </div>
            )}
          </div>
        </div>
      </Message>
    </div>
  );
};

export default ConverterChannel;
