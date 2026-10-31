import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { TRADING_URL } from "@/lib/tka";

interface Fund {
  total: number;
  count: number;
  donors: number;
  mine: number;
  rate: number;
  last: { amount: number; note: string; at: string }[];
}

const fmt = (v: number) => v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FundCard = ({ token }: { token: string | null }) => {
  const { data, isLoading } = useQuery<Fund>({
    queryKey: ["tka-fund", token],
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const r = await fetch(`${TRADING_URL}?action=fund`, { headers: { "X-Auth-Token": token ?? "" } });
      if (!r.ok) throw new Error("bad");
      return r.json();
    },
  });

  return (
    <section className="rounded-xl border border-border bg-card p-3 space-y-2">
      <h3 className="font-display text-sm text-white flex items-center gap-2">
        <Icon name="Landmark" size={15} className="text-primary" /> Фонд
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">комиссия 0,05%</span>
      </h3>
      {isLoading || !data ? (
        <Skeleton className="h-16 w-full bg-rail" />
      ) : (
        <>
          <div className="font-display text-2xl text-white leading-none">
            {fmt(data.total)} <span className="text-xs text-primary font-semibold">TKA</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-rail/50 px-2 py-1.5">
              <div className="text-muted-foreground">Ваш вклад</div>
              <div className="font-mono text-white">{fmt(data.mine)}</div>
            </div>
            <div className="rounded-lg bg-rail/50 px-2 py-1.5">
              <div className="text-muted-foreground">Участников</div>
              <div className="font-mono text-white">{data.donors}</div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            В фонд идёт комиссия с каждого обмена. Позже из фонда будут призы и награды для участников.
          </p>
        </>
      )}
    </section>
  );
};

export default FundCard;
