import { Bar, BarChart, Cell, ComposedChart, Line as RLine, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Candle, DOWN, UP, fmtVol } from "./chartUtils";

interface Props {
  visible: Candle[];
  on: Record<string, boolean>;
}

const IndicatorPanes = ({ visible, on }: Props) => (
          <>
          {visible.some((c) => c.v > 0) && (
            <div className="h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visible} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis orientation="right" tickFormatter={fmtVol} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={72} tickCount={3} />
                  <Bar dataKey="v" isAnimationActive={false}>
                    {visible.map((c) => (
                      <Cell key={c.t} fill={c.c >= c.o ? UP : DOWN} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {on.rsi && (
            <div className="h-[90px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visible} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis orientation="right" domain={[0, 100]} ticks={[30, 70]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                  <ReferenceLine y={70} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <RLine type="monotone" dataKey="rsi" stroke="#F472B6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {on.macd && (
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={visible} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis orientation="right" domain={["auto", "auto"]} tickFormatter={(v: number) => (Math.abs(v) >= 1 ? v.toFixed(1) : v.toPrecision(2))} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={72} tickCount={3} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="hist" isAnimationActive={false}>
                    {visible.map((c) => (
                      <Cell key={c.t} fill={(c.hist ?? 0) >= 0 ? UP : DOWN} fillOpacity={0.7} />
                    ))}
                  </Bar>
                  <RLine type="monotone" dataKey="macd" stroke="#38BDF8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <RLine type="monotone" dataKey="sig" stroke="#FACC15" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          </>
);

export default IndicatorPanes;
