import { useState } from "react";
import PriceFill from "./PriceFill";
import { CalcProps, Field, Note, NumInput, Panel, Result, Segment, fmt, num } from "./shared";

const PositionSizeCalc = ({ coins }: CalcProps) => {
  const [side, setSide] = useState<"long" | "short">("long");
  const [deposit, setDeposit] = useState("1000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [lev, setLev] = useState("1");

  const d = num(deposit);
  const r = num(riskPct);
  const e = num(entry);
  const s = num(stop);
  const l = Math.max(1, num(lev) || 1);
  const dirOk = side === "long" ? s < e : s > e;
  const ok = [d, r, e, s].every((v) => Number.isFinite(v) && v > 0) && dirOk;

  const riskUsd = ok ? (d * r) / 100 : NaN;
  const stopDist = ok ? Math.abs(e - s) : NaN;
  const qty = ok ? riskUsd / stopDist : NaN;
  const volume = qty * e;
  const margin = volume / l;

  return (
    <Panel>
      <Segment value={side} onChange={setSide} options={[{ id: "long", label: "Лонг" }, { id: "short", label: "Шорт" }]} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Депозит, $"><NumInput value={deposit} onChange={setDeposit} /></Field>
        <Field label="Риск на сделку, %"><NumInput value={riskPct} onChange={setRiskPct} /></Field>
        <Field label="Цена входа" className="col-span-2">
          <NumInput value={entry} onChange={setEntry} placeholder="0" />
          <PriceFill coins={coins} onFill={setEntry} />
        </Field>
        <Field label="Стоп-лосс"><NumInput value={stop} onChange={setStop} placeholder="0" /></Field>
        <Field label="Плечо"><NumInput value={lev} onChange={setLev} /></Field>
      </div>
      {entry && stop && Number.isFinite(e) && Number.isFinite(s) && !dirOk && (
        <div className="text-down text-xs">{side === "long" ? "Для лонга стоп должен быть ниже входа" : "Для шорта стоп должен быть выше входа"}</div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Result label="Рискуете" value={ok ? `${fmt(riskUsd, 2)} $` : "—"} cls="text-down" />
        <Result label="Размер позиции" value={ok ? fmt(qty, 6) : "—"} sub="в монетах" />
        <Result label="Объём сделки" value={ok ? `${fmt(volume, 2)} $` : "—"} />
        <Result label="Нужная маржа" value={ok ? `${fmt(margin, 2)} $` : "—"} cls={ok && margin > d ? "text-down" : "text-white"} sub={ok && margin > d ? "больше депозита" : undefined} />
      </div>
      <Note>Профессионалы рискуют 1–2% депозита за сделку. Калькулятор считает, сколько монет купить, чтобы при срабатывании стопа потерять ровно выбранную сумму.</Note>
    </Panel>
  );
};

export default PositionSizeCalc;
