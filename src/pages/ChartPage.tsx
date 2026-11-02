import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import CandleChart from "@/components/crypto/CandleChart";
import { useAuth } from "@/lib/auth";
import { TRADING_API, State } from "@/components/crypto/trading/shared";

const ChartPage = ({ coinId }: { coinId: string }) => {
  const { token } = useAuth();
  const { data: st } = useQuery<State>({
    queryKey: ["trading", token],
    queryFn: async () => (await fetch(TRADING_API, { headers: { "X-Auth-Token": token ?? "" } })).json(),
    enabled: !!token,
    refetchInterval: 20_000,
  });
  const { data: fast } = useQuery<{ prices: Record<string, number> }>({
    queryKey: ["trading-prices"],
    queryFn: async () => (await fetch(`${TRADING_API}?action=prices`)).json(),
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
  const price = fast?.prices[coinId] ?? st?.prices[coinId] ?? 0;
  const pos = st?.positions.filter((p) => p.coinId === coinId) ?? [];
  const lines = [
    ...pos.map((p) => ({ price: p.entry, label: `${p.side === "long" ? "Лонг" : "Шорт"} x${p.leverage}`, color: p.side === "long" ? "#16C784" : "#EA3943" })),
    ...(st?.orders.filter((o) => o.coinId === coinId).map((o) => ({ price: o.limit, label: "Ордер", color: "hsl(var(--accent))" })) ?? []),
    ...pos.filter((p) => p.sl).map((p) => ({ price: p.sl as number, label: "Стоп-лосс", color: "#EA3943" })),
    ...pos.filter((p) => p.tp).map((p) => ({ price: p.tp as number, label: "Тейк-профит", color: "#22C55E" })),
    ...pos.map((p) => ({ price: p.liq, label: "Ликвидация", color: "#EA3943" })),
  ];

  return (
    <div className="min-h-screen bg-[#080A0D] p-2 sm:p-4">
      <Link to="/trading" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white mb-2">
        <Icon name="ChevronLeft" size={16} /> Назад к бирже
      </Link>
      <CandleChart coinId={coinId} price={price} lines={lines} plotClass="h-[calc(100dvh-210px)] min-h-[320px]" />
    </div>
  );
};

export default ChartPage;
