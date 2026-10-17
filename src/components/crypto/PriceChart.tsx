import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Coin, COIN_META, fmtBig, fmtPct, fmtPrice, useChart } from "@/lib/crypto";
import { Skeleton } from "@/components/ui/skeleton";
import { CoinLogo } from "./QuotesTable";

const RANGES = [
  { d: 1, label: "1Д" },
  { d: 7, label: "1Н" },
  { d: 30, label: "1М" },
  { d: 90, label: "3М" },
  { d: 365, label: "1Г" },
];

const PriceChart = ({ coin }: { coin: Coin }) => {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useChart(coin.id, days, coin.current_price);
  const first = data?.[0]?.p ?? coin.current_price;
  const last = data?.[data.length - 1]?.p ?? coin.current_price;
  const change = ((last - first) / first) * 100;
  const up = change >= 0;
  const color = up ? "hsl(var(--up))" : "hsl(var(--down))";

  const fmtTick = (t: number) => {
    const d = new Date(t);
    return days <= 1
      ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 flex flex-wrap items-start justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-3">
          <CoinLogo coin={coin} size={40} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-coin font-bold text-white text-lg">{COIN_META[coin.id]?.ru ?? coin.name}</span>
              <span className="font-mono text-xs text-muted-foreground bg-rail px-1.5 py-0.5 rounded">
                {COIN_META[coin.id]?.short ?? coin.symbol.toUpperCase()}/USD
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span className="font-mono text-2xl sm:text-3xl text-white tabular">{fmtPrice(coin.current_price, coin.id)}</span>
              <span className={`font-mono text-sm tabular ${up ? "text-up" : "text-down"}`}>
                {fmtPct(change)} за период
              </span>
            </div>
          </div>
        </div>
        <div className="flex bg-rail rounded p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.d}
              onClick={() => setDays(r.d)}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                days === r.d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[260px] sm:h-[320px] px-1 pt-4">
        {isLoading || !data ? (
          <Skeleton className="w-full h-full bg-rail" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="pc-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                tickFormatter={fmtTick}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                dataKey="p"
                domain={["auto", "auto"]}
                orientation="right"
                tickFormatter={(v: number) => fmtPrice(v, coin.id)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--input))",
                  borderRadius: 6,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                itemStyle={{ color: "#fff" }}
                labelFormatter={(t: number) => new Date(t).toLocaleString("ru-RU")}
                formatter={(v: number) => [fmtPrice(v, coin.id), "Цена"]}
              />
              <Area type="monotone" dataKey="p" stroke={color} strokeWidth={2} fill="url(#pc-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border text-xs">
        {[
          ["Макс. 24ч", fmtPrice(coin.high_24h, coin.id)],
          ["Мин. 24ч", fmtPrice(coin.low_24h, coin.id)],
          ["Объём 24ч", coin.kind ? `${coin.total_volume.toLocaleString("ru-RU")} контр.` : fmtBig(coin.total_volume)],
          ["Капитализация", coin.market_cap ? fmtBig(coin.market_cap) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="p-3 border-r border-white/5 last:border-r-0">
            <div className="text-muted-foreground mb-0.5">{k}</div>
            <div className="font-mono text-white tabular">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriceChart;
