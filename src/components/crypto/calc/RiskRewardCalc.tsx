import { useState } from "react";
import PriceFill from "./PriceFill";
import { CalcProps, Field, Note, NumInput, Panel, Result, Segment, fmt, num } from "./shared";

const RiskRewardCalc = ({ coins }: CalcProps) => {
  const [side, setSide] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [take, setTake] = useState("");

  const e = num(entry);
  const s = num(stop);
  const t = num(take);
  const dirOk = side === "long" ? s < e && t > e : s > e && t < e;
  const ok = [e, s, t].every((v) => Number.isFinite(v) && v > 0) && dirOk;

  const risk = Math.abs(e - s);
  const reward = Math.abs(t - e);
  const rr = ok ? reward / risk : NaN;
  const winRate = ok ? (1 / (1 + rr)) * 100 : NaN;

  return (
    <Panel>
      <Segment value={side} onChange={setSide} options={[{ id: "long", label: "Лонг" }, { id: "short", label: "Шорт" }]} />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Цена входа" className="col-span-3">
          <NumInput value={entry} onChange={setEntry} placeholder="0" />
          <PriceFill coins={coins} onFill={setEntry} />
        </Field>
        <Field label="Стоп-лосс"><NumInput value={stop} onChange={setStop} placeholder="0" /></Field>
        <Field label="Тейк-профит"><NumInput value={take} onChange={setTake} placeholder="0" /></Field>
      </div>
      {entry && stop && take && [e, s, t].every(Number.isFinite) && !dirOk && (
        <div className="text-down text-xs">{side === "long" ? "Для лонга: стоп ниже входа, тейк выше" : "Для шорта: стоп выше входа, тейк ниже"}</div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Result label="Риск / прибыль" value={ok ? `1 : ${fmt(rr, 2)}` : "—"} cls={ok ? (rr >= 2 ? "text-up" : rr >= 1 ? "text-white" : "text-down") : "text-white"} />
        <Result label="Риск до стопа" value={ok ? `${fmt((risk / e) * 100, 2)}%` : "—"} cls="text-down" />
        <Result label="Потенциал до тейка" value={ok ? `${fmt((reward / e) * 100, 2)}%` : "—"} cls="text-up" />
        <Result label="Безубыточный винрейт" value={ok ? `${fmt(winRate, 1)}%` : "—"} sub="чтобы не терять" />
      </div>
      <Note>Хорошей считается сделка от 1 к 2 и выше: потенциальная прибыль минимум вдвое больше риска. Безубыточный винрейт — доля прибыльных сделок, при которой серия выходит в ноль.</Note>
    </Panel>
  );
};

export default RiskRewardCalc;
