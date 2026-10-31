import { useState } from "react";
import { Field, Note, NumInput, Panel, Segment, fmt, num } from "./shared";

type Method = "classic" | "fib" | "camarilla" | "woodie";

const compute = (m: Method, h: number, l: number, c: number, o: number) => {
  const r = h - l;
  if (m === "classic") {
    const p = (h + l + c) / 3;
    return { p, r1: 2 * p - l, r2: p + r, r3: h + 2 * (p - l), s1: 2 * p - h, s2: p - r, s3: l - 2 * (h - p) };
  }
  if (m === "fib") {
    const p = (h + l + c) / 3;
    return { p, r1: p + 0.382 * r, r2: p + 0.618 * r, r3: p + r, s1: p - 0.382 * r, s2: p - 0.618 * r, s3: p - r };
  }
  if (m === "camarilla") {
    const p = (h + l + c) / 3;
    return { p, r1: c + (r * 1.1) / 12, r2: c + (r * 1.1) / 6, r3: c + (r * 1.1) / 4, s1: c - (r * 1.1) / 12, s2: c - (r * 1.1) / 6, s3: c - (r * 1.1) / 4 };
  }
  const p = (h + l + 2 * (o || c)) / 4;
  return { p, r1: 2 * p - l, r2: p + r, r3: h + 2 * (p - l), s1: 2 * p - h, s2: p - r, s3: l - 2 * (h - p) };
};

const PivotCalc = () => {
  const [method, setMethod] = useState<Method>("classic");
  const [high, setHigh] = useState("");
  const [low, setLow] = useState("");
  const [close, setClose] = useState("");
  const [open, setOpen] = useState("");

  const h = num(high);
  const l = num(low);
  const c = num(close);
  const o = num(open);
  const ok = [h, l, c].every(Number.isFinite) && h >= l;
  const res = ok ? compute(method, h, l, c, o) : null;

  const rows: { k: keyof NonNullable<typeof res>; label: string; cls: string }[] = [
    { k: "r3", label: "R3 — сопротивление 3", cls: "text-up" },
    { k: "r2", label: "R2 — сопротивление 2", cls: "text-up" },
    { k: "r1", label: "R1 — сопротивление 1", cls: "text-up" },
    { k: "p", label: "PP — точка разворота", cls: "text-white" },
    { k: "s1", label: "S1 — поддержка 1", cls: "text-down" },
    { k: "s2", label: "S2 — поддержка 2", cls: "text-down" },
    { k: "s3", label: "S3 — поддержка 3", cls: "text-down" },
  ];

  return (
    <Panel>
      <Segment
        value={method}
        onChange={setMethod}
        options={[
          { id: "classic", label: "Классика" },
          { id: "fib", label: "Фибоначчи" },
          { id: "camarilla", label: "Камарилья" },
          { id: "woodie", label: "Вуди" },
        ]}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Field label="Максимум (High)"><NumInput value={high} onChange={setHigh} placeholder="0" /></Field>
        <Field label="Минимум (Low)"><NumInput value={low} onChange={setLow} placeholder="0" /></Field>
        <Field label="Закрытие (Close)"><NumInput value={close} onChange={setClose} placeholder="0" /></Field>
        {method === "woodie" && <Field label="Открытие (Open)" hint="Необязательно"><NumInput value={open} onChange={setOpen} placeholder="0" /></Field>}
      </div>
      {high && low && Number.isFinite(h) && Number.isFinite(l) && h < l && <div className="text-down text-xs">Максимум не может быть ниже минимума</div>}
      <div className="divide-y divide-white/5 bg-rail rounded">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={`font-mono ${r.cls}`}>{res ? fmt(res[r.k]) : "—"}</span>
          </div>
        ))}
      </div>
      <Note>Введите High, Low и Close прошлого дня (или недели). Цена выше PP — настроение бычье, ниже — медвежье. Уровни R — возможные сопротивления, S — поддержки.</Note>
    </Panel>
  );
};

export default PivotCalc;
