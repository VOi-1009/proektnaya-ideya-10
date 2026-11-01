import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fundFmt, useFund } from "@/lib/fund";

const FundCard = ({ go }: { go?: (ch: string) => void }) => {
  const { token } = useAuth();
  const { data, isLoading } = useFund(token);
  const rate = data ? (data.rate * 100).toFixed(2).replace(".", ",") : "0,05";

  return (
    <section className="rounded-xl border border-border bg-card p-3 space-y-2">
      <h3 className="font-display text-sm text-white flex items-center gap-2">
        <Icon name="Landmark" size={15} className="text-primary" /> {data?.title ?? "Фонд"}
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">комиссия {rate}%</span>
      </h3>
      {isLoading || !data ? (
        <Skeleton className="h-16 w-full bg-rail" />
      ) : (
        <>
          <div className="font-display text-2xl text-white leading-none">
            {fundFmt(data.total)} <span className="text-xs text-primary font-semibold">TKA</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-rail/50 px-2 py-1.5">
              <div className="text-muted-foreground">Ваш вклад</div>
              <div className="font-mono text-white">{fundFmt(data.mine)}</div>
            </div>
            <div className="rounded-lg bg-rail/50 px-2 py-1.5">
              <div className="text-muted-foreground">Участников</div>
              <div className="font-mono text-white">{data.donors}</div>
            </div>
          </div>
          {go && (
            <button onClick={() => go("fund")} className="text-[11px] text-primary hover:underline">
              Подробнее о фонде →
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default FundCard;
