import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import func2url from "../../../backend/func2url.json";

interface Stats { trades: number; wins: number; winRate: number; avgPnl: number; avgPct: number; best: number; bestPct: number; worst: number; worstPct: number; totalPnl: number; curve: { t: string; v: number }[] }

const usd = (v: number, sign = false) => `${sign && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const tone = (v: number) => (v >= 0 ? "text-[#22C55E]" : "text-[#EA3943]");

const Cell = ({ label, value, sub, cls = "text-white" }: { label: string; value: string; sub?: string; cls?: string }) => (
  <div className="rounded-xl border border-border p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`font-mono text-base ${cls}`}>{value}</div>
    {sub && <div className={`text-xs font-mono ${cls}`}>{sub}</div>}
  </div>
);

interface Props { token?: string | null; userId?: number }

const TradingStats = ({ token, userId }: Props) => {
  const compact = userId !== undefined;
  const { data, isLoading } = useQuery<{ stats: Stats | null }>({
    queryKey: ["trading-stats", compact ? userId : token],
    queryFn: async () => {
      const r = await fetch(compact ? `${func2url.trading}?action=profile&userId=${userId}` : func2url.trading, { headers: { "X-Auth-Token": token ?? "" } });
      if (!r.ok) throw new Error("bad");
      return r.json();
    },
    enabled: compact || !!token,
    staleTime: 30_000,
  });
  const s = data?.stats ?? undefined;
  if (compact && !isLoading && !s) return null;
  const curve = (s?.curve ?? []).map((p, i, a) => ({ t: p.t === "now" ? Date.now() : new Date(p.t + (p.t.endsWith("Z") ? "" : "Z")).getTime(), v: p.v, i }));
  const up = (s?.totalPnl ?? 0) >= 0;
  const color = up ? "#22C55E" : "#EA3943";

  return (
    <section className={compact ? "" : "bg-card border border-border rounded-2xl p-4 sm:p-5"}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-semibold text-sm flex items-center gap-1.5">
          <Icon name="LineChart" size={15} className="text-primary" /> Тренировочная биржа
        </span>
        {s && !compact && <span className="text-xs text-muted-foreground">с последнего сброса счёта</span>}
      </div>
      {isLoading || !s ? (
        <Skeleton className="h-40 w-full bg-rail" />
      ) : s.trades === 0 && curve.length < 3 ? (
        <p className="text-sm text-muted-foreground">Закрытых сделок пока нет. Откройте и закройте первую на тренировочной бирже, и здесь появится статистика.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Cell label="Прибыльных сделок" value={`${s.winRate.toFixed(0)}%`} sub={`${s.wins} из ${s.trades}`} cls={s.winRate >= 50 ? "text-[#22C55E]" : "text-white"} />
            <Cell label="Общий PnL" value={usd(s.totalPnl, true)} cls={tone(s.totalPnl)} />
            {!compact && <Cell label="Средний результат" value={usd(s.avgPnl, true)} sub={`${s.avgPct > 0 ? "+" : ""}${s.avgPct.toFixed(1)}%`} cls={tone(s.avgPnl)} />}
            {!compact && <Cell label="Всего сделок" value={String(s.trades)} />}
            <Cell label="Лучшая сделка" value={usd(s.best, true)} sub={`${s.bestPct > 0 ? "+" : ""}${s.bestPct.toFixed(1)}%`} cls={tone(s.best)} />
            {!compact && <Cell label="Худшая сделка" value={usd(s.worst, true)} sub={`${s.worstPct > 0 ? "+" : ""}${s.worstPct.toFixed(1)}%`} cls={tone(s.worst)} />}
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Изменение капитала</div>
            <div className={compact ? "h-[110px]" : "h-[160px]"}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curve} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="i" hide />
                  <YAxis orientation="right" domain={["auto", "auto"]} tickFormatter={(v: number) => Math.round(v).toLocaleString("ru-RU")} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                  <ReferenceLine y={10000} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Tooltip
                    content={({ active, payload }) => {
                      const p = active ? (payload?.[0]?.payload as { t: number; v: number } | undefined) : undefined;
                      if (!p) return null;
                      return (
                        <div className="rounded-md border border-border bg-popover px-2 py-1 text-xs font-mono text-white">
                          <div className="text-muted-foreground">{new Date(p.t).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                          {usd(p.v)}
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#eq-grad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default TradingStats;
