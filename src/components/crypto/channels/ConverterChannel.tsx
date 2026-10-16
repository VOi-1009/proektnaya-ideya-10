import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Coin, COIN_META, fmtPrice } from "@/lib/crypto";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Message from "../Message";

const ConverterChannel = ({ coins }: { coins: Coin[] }) => {
  const [from, setFrom] = useState("bitcoin");
  const [to, setTo] = useState("usd");
  const [amount, setAmount] = useState("1");

  const priceOf = (id: string) => (id === "usd" ? 1 : coins.find((c) => c.id === id)?.current_price ?? 0);
  const label = (id: string) => (id === "usd" ? "USD" : COIN_META[id]?.short ?? id);

  const result = useMemo(() => {
    const a = parseFloat(amount.replace(",", "."));
    if (Number.isNaN(a) || a < 0) return null;
    const p2 = priceOf(to);
    if (!p2) return null;
    return (a * priceOf(from)) / p2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, from, to, coins]);

  const invalid = amount !== "" && result === null;
  const options = [{ id: "usd", name: "Доллар США" }, ...coins.map((c) => ({ id: c.id, name: COIN_META[c.id]?.ru ?? c.name }))];

  const fmtResult = (v: number) =>
    v.toLocaleString("ru-RU", { maximumFractionDigits: v >= 1000 ? 2 : v >= 1 ? 4 : 8 });

  return (
    <div className="space-y-4">
      <Message author="Traderka Бот" time="Сегодня" icon="ArrowLeftRight" bot>
        <p className="text-muted-foreground mb-3">
          Быстрый пересчёт между монетами и долларом по текущему курсу. Удобно, чтобы прикинуть размер позиции.
        </p>
        <div className="bg-card border border-border rounded-lg p-4 max-w-xl space-y-3">
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
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="w-[150px] bg-rail border-0 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {label(o.id)} · {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="w-[150px] bg-rail border-0 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {label(o.id)} · {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            1 {label(from)} = {to === "usd" ? fmtPrice(priceOf(from)) : `${fmtResult(priceOf(from) / (priceOf(to) || 1))} ${label(to)}`}
          </div>
        </div>
      </Message>
    </div>
  );
};

export default ConverterChannel;
