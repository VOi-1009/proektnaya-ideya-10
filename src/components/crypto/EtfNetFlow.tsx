import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmcMetrics } from "@/lib/cmcMetrics";

const BTC = "#f7931a";
const ETH = "#3b9cf2";

const fmtM = (v: number) => {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2).replace(".", ",")} млрд`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1).replace(".", ",")} млн`;
  return `${sign}$${Math.round(a / 1e3)} тыс`;
};
const fmtDate = (t: number) => new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

const EtfNetFlow = () => {
  const { data, isLoading, isError } = useCmcMetrics();
  const etf = data?.etf;

  return (
    <div className="h-full p-3 sm:p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-white text-sm sm:text-base leading-tight">Чистый поток средств в криптовалютные ETF</h3>
          <div className="text-muted-foreground text-[11px] mt-0.5">за 30 дней, по дням</div>
        </div>
        {etf && (
          <div className="text-right flex-shrink-0">
            <div className="font-mono tabular text-sm" style={{ color: etf.total >= 0 ? "hsl(var(--up))" : "hsl(var(--down))" }}>
              {etf.total > 0 ? "+" : ""}
              {fmtM(etf.total)}
            </div>
            <div className="text-muted-foreground text-[10px]">последний день</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: BTC }} /> Bitcoin
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: ETH }} /> Ethereum
        </span>
      </div>

      <div className="flex-1 min-h-[200px]">
        {isLoading ? (
          <Skeleton className="w-full h-full min-h-[200px] bg-rail" />
        ) : isError || !etf?.points.length ? (
          <div className="h-full min-h-[200px] flex items-center justify-center text-sm text-muted-foreground">Данные временно недоступны</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={etf.points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} stackOffset="sign">
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" tickFormatter={fmtDate} tick={{ fill: "#9ca3af", fontSize: 10 }} minTickGap={24} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtM(v).replace(" млн", "M").replace(" млрд", "B")} tick={{ fill: "#9ca3af", fontSize: 10 }} width={54} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="#4b5563" />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{ background: "#1b1b22", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(t) => fmtDate(Number(t))}
                formatter={(v: number, n: string) => [fmtM(v), n]}
              />
              <Bar dataKey="btc" name="Bitcoin" stackId="a" fill={BTC} isAnimationActive={false} />
              <Bar dataKey="eth" name="Ethereum" stackId="a" fill={ETH} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">Источник: CoinMarketCap</div>
    </div>
  );
};

export default EtfNetFlow;
