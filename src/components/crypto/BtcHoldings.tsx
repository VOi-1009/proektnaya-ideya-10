import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCmcMetrics } from "@/lib/cmcMetrics";

const fmtInt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const BtcHoldings = () => {
  const { data, isLoading, isError } = useCmcMetrics();
  const t = data?.treasuries;

  if (isLoading) return <Skeleton className="w-full h-full min-h-[80px] bg-rail" />;
  if (isError || !t) return <div className="p-3 text-xs text-muted-foreground">Данные временно недоступны</div>;

  return (
    <div className="h-full p-3 flex flex-col justify-center gap-1.5">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
        <Icon name="Landmark" size={12} className="text-primary" /> Общее количество удерживаемых BTC
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Что такое удерживаемые BTC" className="text-primary animate-soft-blink hover:animate-none hover:opacity-100 normal-case">
              <Icon name="Info" size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-xs font-normal normal-case tracking-normal leading-snug">
            Количество Bitcoin, которое хранится в казначействах публично торгуемых компаний.
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground text-xs">Всего</span>
        <span className="font-mono tabular text-white">{fmtInt(t.total)} BTC</span>
      </div>
      {t.top && (
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-muted-foreground text-xs">Крупнейший: {t.top.name}</span>
          <span className="font-mono tabular text-white">{fmtInt(t.top.holdings)} BTC</span>
        </div>
      )}
    </div>
  );
};

export default BtcHoldings;
