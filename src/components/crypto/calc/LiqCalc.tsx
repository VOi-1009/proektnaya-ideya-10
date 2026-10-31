import { useState } from "react";
import PriceFill from "./PriceFill";
import { CalcProps, Field, Note, NumInput, Panel, Result, Segment, fmt, num } from "./shared";

const LiqCalc = ({ coins }: CalcProps) => {
  const [side, setSide] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState("");
  const [lev, setLev] = useState("10");
  const [mmr, setMmr] = useState("0.5");

  const e = num(entry);
  const l = Math.max(1, num(lev) || 1);
  const mm = Math.max(0, num(mmr) || 0) / 100;
  const ok = Number.isFinite(e) && e > 0;

  const liq = ok ? (side === "long" ? e * (1 - 1 / l + mm) : e * (1 + 1 / l - mm)) : NaN;
  const dist = ok ? (Math.abs(liq - e) / e) * 100 : NaN;

  return (
    <Panel>
      <Segment value={side} onChange={setSide} options={[{ id: "long", label: "Лонг" }, { id: "short", label: "Шорт" }]} />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Цена входа" className="col-span-3">
          <NumInput value={entry} onChange={setEntry} placeholder="0" />
          <PriceFill coins={coins} onFill={setEntry} />
        </Field>
        <Field label="Плечо"><NumInput value={lev} onChange={setLev} /></Field>
        <Field label="Поддерж. маржа, %" hint="У бирж обычно 0,4–1%"><NumInput value={mmr} onChange={setMmr} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Result label="Цена ликвидации" value={ok ? fmt(liq, 6) : "—"} cls="text-down" />
        <Result label="До ликвидации" value={ok ? `${fmt(dist, 2)}%` : "—"} sub={ok ? (side === "long" ? "падение цены" : "рост цены") : undefined} />
      </div>
      <Note>Изолированная маржа без учёта комиссий и фондирования. У каждой биржи формула немного отличается, поэтому ориентируйтесь на цифру как на оценку.</Note>
    </Panel>
  );
};

export default LiqCalc;
