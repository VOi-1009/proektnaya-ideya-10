import { INDICATORS, INTERVALS } from "./chartUtils";

interface Props {
  interval: string;
  setIntervalV: (v: string) => void;
  on: Record<string, boolean>;
  setOn: (fn: (o: Record<string, boolean>) => Record<string, boolean>) => void;
}

const ChartFooter = ({ interval, setIntervalV, on, setOn }: Props) => (
      <div className="flex flex-wrap items-center gap-2 mt-2">
      <div className="flex bg-rail rounded p-0.5 w-fit">
        {INTERVALS.map((r) => (
          <button
            key={r.v}
            onClick={() => setIntervalV(r.v)}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              interval === r.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex bg-rail rounded p-0.5 w-fit">
        {INDICATORS.map((ind) => (
          <button
            key={ind.k}
            onClick={() => setOn((o) => ({ ...o, [ind.k]: !o[ind.k] }))}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${on[ind.k] ? "bg-hover text-white" : "text-muted-foreground hover:text-white"}`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: on[ind.k] ? ind.color : "transparent", border: `1px solid ${ind.color}` }} />
            {ind.label}
          </button>
        ))}
      </div>
      </div>
);

export default ChartFooter;
