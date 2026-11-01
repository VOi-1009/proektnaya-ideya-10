import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fundFmt } from "@/lib/fund";

const day = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(Math.round(v)));

const FundChart = ({ data }: { data: { d: string; total: number; in: number }[] }) => {
  const gained = data.length ? data[data.length - 1].total - data[0].total : 0;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">Рост фонда за 30 дней</h3>
          <div className="text-[11px] text-muted-foreground">Сумма в фонде на конец каждого дня, TKA</div>
        </div>
        <div className={`font-mono text-sm ${gained >= 0 ? "text-[#22C55E]" : "text-[#EA3943]"}`}>
          {gained > 0 ? "+" : gained < 0 ? "−" : ""}{fundFmt(Math.abs(gained))}
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fundFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="d" tickFormatter={day} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis tickFormatter={short} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} width={40} domain={[0, "auto"]} />
            <Tooltip
              contentStyle={{ background: "#1b1b22", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(v) => day(String(v))}
              formatter={(v: number, n: string) => [`${fundFmt(v)} TKA`, n === "total" ? "В фонде" : "Поступило за день"]}
            />
            <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#fundFill)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default FundChart;
