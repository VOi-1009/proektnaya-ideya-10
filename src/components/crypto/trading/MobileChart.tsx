import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPrice } from "@/lib/crypto";
import { useAuth } from "@/lib/auth";
import CandleChart from "../CandleChart";
import { Line, loadKlines } from "../candle/chartUtils";

interface Props {
  coinId: string;
  price: number;
  lines: Line[];
  liqPrice?: number;
  onQuick?: (side: "long" | "short") => void;
  quickInfo?: string;
  quickDisabled?: boolean;
  closeInfo?: string;
  closeProfit?: boolean;
  onCloseAll?: () => void;
  closeDisabled?: boolean;
}

const MobileChart = (p: Props) => {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const { data } = useQuery({
    queryKey: ["mini-klines", p.coinId, "1m", !!token],
    queryFn: async () => (await loadKlines(p.coinId, "1m", token)).slice(-60).map((c) => ({ t: c.t, p: c.c })),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const pts = data ?? [];
  const first = pts[0]?.p ?? 0;
  const last = p.price || pts[pts.length - 1]?.p || 0;
  const pct = first ? ((last - first) / first) * 100 : 0;
  const up = pct >= 0;
  const color = up ? "#22C55E" : "#EA3943";
  const entries = p.lines.filter((l) => l.label.startsWith("Лонг") || l.label.startsWith("Шорт"));

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full text-left rounded-xl border border-border bg-card p-3 active:bg-hover/40 transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-display text-white text-sm">График</span>
          <span className="font-mono text-white text-sm">{last ? fmtPrice(last, p.coinId) : "—"}</span>
          <span className="font-mono text-xs" style={{ color }}>{up ? "+" : ""}{pct.toFixed(2).replace(".", ",")}% за час · свечи 1м</span>
          <span className="ml-auto flex items-center gap-1 text-[11px] text-primary font-semibold">
            Открыть <Icon name="Maximize2" size={13} />
          </span>
        </div>
        <div className="h-28 mt-2 pointer-events-none">
          {pts.length < 2 ? (
            <Skeleton className="h-full w-full bg-rail" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pts} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="mcFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Area type="monotone" dataKey="p" stroke={color} strokeWidth={1.8} fill="url(#mcFill)" dot={false} isAnimationActive={false} />
                {last > 0 && (
                  <ReferenceLine
                    y={last}
                    ifOverflow="extendDomain"
                    stroke={color}
                    strokeDasharray="2 3"
                    label={(lp: { viewBox?: { x: number; y: number; width: number } }) => {
                      const vb = lp.viewBox;
                      if (!vb) return <g />;
                      const w = 64;
                      const x = vb.x + vb.width - w;
                      return (
                        <g>
                          <rect x={x} y={vb.y - 8} width={w} height={16} rx={3} fill={color} />
                          <text x={x + w / 2} y={vb.y + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#fff" fontFamily="monospace">{fmtPrice(last, p.coinId)}</text>
                        </g>
                      );
                    }}
                  />
                )}
                {entries.map((l, i) => (
                  <ReferenceLine key={i} y={l.price} ifOverflow="hidden" stroke={l.color} strokeDasharray="4 4" />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        {entries.length > 0 && <div className="text-[10px] text-muted-foreground mt-1">Пунктиром показаны ваши входы</div>}
      </button>

      <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
        <DrawerContent className="h-[92vh] max-h-[92vh] px-3 pb-3">
          <DrawerTitle className="sr-only">График {p.coinId}</DrawerTitle>
          <div className="flex-1 min-h-0 overflow-y-auto mt-2">
            <CandleChart {...p} plotClass="h-[52vh] min-h-[260px]" />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileChart;
