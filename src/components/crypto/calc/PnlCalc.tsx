import { useState } from "react";
import { Field, Note, NumInput, Panel, Result, Segment, fmt, fmtSigned, num, tone } from "./shared";

const PnlCalc = () => {
  const [side, setSide] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [margin, setMargin] = useState("100");
  const [lev, setLev] = useState("1");
  const [fee, setFee] = useState("0.05");

  const e = num(entry);
  const x = num(exit);
  const m = num(margin);
  const l = Math.max(1, num(lev) || 1);
  const f = Math.max(0, num(fee) || 0);
  const ok = [e, x, m].every((v) => Number.isFinite(v) && v > 0);

  const volume = ok ? m * l : NaN;
  const move = ok ? ((x - e) / e) * (side === "long" ? 1 : -1) : NaN;
  const gross = volume * move;
  const fees = ok ? (volume * f * 2) / 100 : NaN;
  const net = gross - fees;
  const roe = (net / m) * 100;

  return (
    <Panel>
      <Segment value={side} onChange={setSide} options={[{ id: "long", label: "Лонг" }, { id: "short", label: "Шорт" }]} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <Field label="Цена входа"><NumInput value={entry} onChange={setEntry} placeholder="0" /></Field>
        <Field label="Цена выхода"><NumInput value={exit} onChange={setExit} placeholder="0" /></Field>
        <Field label="Ставка (маржа), $"><NumInput value={margin} onChange={setMargin} /></Field>
        <Field label="Плечо"><NumInput value={lev} onChange={setLev} /></Field>
        <Field label="Комиссия, % за сторону"><NumInput value={fee} onChange={setFee} /></Field>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Result label="Результат" value={ok ? `${fmtSigned(net)} $` : "—"} cls={ok ? tone(net) : "text-white"} />
        <Result label="Доходность от ставки" value={ok ? fmtSigned(roe, "%") : "—"} cls={ok ? tone(roe) : "text-white"} />
        <Result label="Объём сделки" value={ok ? `${fmt(volume, 2)} $` : "—"} />
        <Result label="Комиссии" value={ok ? `${fmt(fees, 2)} $` : "—"} sub="вход и выход" />
      </div>
      <Note>Результат считается от объёма сделки (ставка × плечо). Комиссия берётся дважды: при входе и при выходе.</Note>
    </Panel>
  );
};

export default PnlCalc;
