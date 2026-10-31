import { useState } from "react";
import { Field, Note, NumInput, Panel, Segment, fmt, num } from "./shared";

const RETRACE = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const EXT = [1.272, 1.618, 2, 2.618];

const FibCalc = () => {
  const [trend, setTrend] = useState<"up" | "down">("up");
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");

  const lo = num(low);
  const hi = num(high);
  const ok = Number.isFinite(lo) && Number.isFinite(hi) && hi > lo;
  const range = hi - lo;
  const retr = (r: number) => (trend === "up" ? hi - range * r : lo + range * r);
  const ext = (r: number) => (trend === "up" ? lo + range * r : hi - range * r);

  return (
    <Panel>
      <Segment value={trend} onChange={setTrend} options={[{ id: "up", label: "Восходящий тренд" }, { id: "down", label: "Нисходящий тренд" }]} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Минимум движения"><NumInput value={low} onChange={setLow} placeholder="0" /></Field>
        <Field label="Максимум движения"><NumInput value={high} onChange={setHigh} placeholder="0" /></Field>
      </div>
      {low && high && Number.isFinite(lo) && Number.isFinite(hi) && hi <= lo && <div className="text-down text-xs">Максимум должен быть выше минимума</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Коррекция</div>
          <div className="divide-y divide-white/5 bg-rail rounded">
            {RETRACE.map((r) => (
              <div key={r} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className={r === 0.618 || r === 0.382 ? "text-primary font-semibold" : "text-muted-foreground"}>{(r * 100).toFixed(1).replace(".0", "")}%</span>
                <span className="font-mono text-white">{ok ? fmt(retr(r)) : "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Расширение (цели)</div>
          <div className="divide-y divide-white/5 bg-rail rounded">
            {EXT.map((r) => (
              <div key={r} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-muted-foreground">{(r * 100).toFixed(1).replace(".0", "")}%</span>
                <span className="font-mono text-white">{ok ? fmt(ext(r)) : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Note>Уровни коррекции показывают, где цена может отскочить после движения: самые сильные 38,2% и 61,8%. Расширения — возможные цели продолжения тренда.</Note>
    </Panel>
  );
};

export default FibCalc;
