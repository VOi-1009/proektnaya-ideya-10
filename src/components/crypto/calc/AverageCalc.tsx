import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Field, Note, NumInput, Panel, Result, fmt, fmtSigned, num, tone, inputCls } from "./shared";

interface Buy { price: string; qty: string }

const AverageCalc = () => {
  const [buys, setBuys] = useState<Buy[]>([{ price: "", qty: "" }, { price: "", qty: "" }]);
  const [now, setNow] = useState("");

  const set = (i: number, p: Partial<Buy>) => setBuys((b) => b.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const valid = buys.map((b) => ({ p: num(b.price), q: num(b.qty) })).filter((b) => b.p > 0 && b.q > 0);
  const qty = valid.reduce((s, b) => s + b.q, 0);
  const cost = valid.reduce((s, b) => s + b.p * b.q, 0);
  const avg = qty ? cost / qty : NaN;
  const cur = num(now) > 0 ? num(now) : NaN;
  const pnl = qty && cur ? qty * cur - cost : NaN;
  const pct = cost ? (pnl / cost) * 100 : NaN;

  return (
    <Panel>
      <div className="space-y-2">
        {buys.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <Field label={i === 0 ? "Цена покупки" : ""}><NumInput value={b.price} onChange={(v) => set(i, { price: v })} placeholder="0" /></Field>
            <Field label={i === 0 ? "Количество монет" : ""}><NumInput value={b.qty} onChange={(v) => set(i, { qty: v })} placeholder="0" /></Field>
            <button
              type="button"
              disabled={buys.length <= 1}
              onClick={() => setBuys((x) => x.filter((_, j) => j !== i))}
              className="h-10 w-10 rounded text-muted-foreground hover:text-down disabled:opacity-30"
              aria-label="Убрать покупку"
            >
              <Icon name="X" size={16} className="mx-auto" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setBuys((b) => [...b, { price: "", qty: "" }])} className="text-xs text-primary hover:underline flex items-center gap-1">
          <Icon name="Plus" size={14} /> Добавить покупку
        </button>
      </div>
      <Field label="Текущая цена" hint="Укажите, чтобы увидеть результат сейчас">
        <input value={now} onChange={(e) => setNow(e.target.value)} inputMode="decimal" placeholder="0" className={`${inputCls} max-w-xs`} />
      </Field>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Result label="Средняя цена" value={qty ? fmt(avg, 6) : "—"} cls="text-primary" />
        <Result label="Всего монет" value={qty ? fmt(qty, 6) : "—"} />
        <Result label="Вложено" value={qty ? `${fmt(cost, 2)} $` : "—"} />
        <Result label="Результат сейчас" value={Number.isFinite(pnl) ? `${fmtSigned(pnl)} $` : "—"} cls={Number.isFinite(pnl) ? tone(pnl) : "text-white"} sub={Number.isFinite(pct) ? fmtSigned(pct, "%") : undefined} />
      </div>
      <Note>Усреднение: добавляйте все свои покупки одной монеты — калькулятор найдёт среднюю цену входа и текущий результат.</Note>
    </Panel>
  );
};

export default AverageCalc;
