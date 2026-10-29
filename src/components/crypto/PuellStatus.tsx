import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { puellStatus, useCmcMetrics } from "@/lib/cmcMetrics";

const MAX = 5;

const PuellStatus = () => {
  const { data, isLoading, isError } = useCmcMetrics();
  const v = data?.puell?.value;

  if (isLoading) return <Skeleton className="w-full h-full min-h-[80px] bg-rail" />;
  if (isError || v == null) return <div className="p-3 text-xs text-muted-foreground">Данные временно недоступны</div>;

  const st = puellStatus(v);
  const pos = Math.min(Math.max(v / MAX, 0), 1) * 100;

  return (
    <div className="h-full p-3 flex flex-col justify-center gap-1.5">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
        <Icon name="Pickaxe" size={12} className="text-primary" fallback="Gauge" /> Статус Puell Multiple
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Что такое Puell Multiple" className="text-primary animate-soft-blink hover:animate-none hover:opacity-100 normal-case">
              <Icon name="Info" size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px] text-xs font-normal normal-case tracking-normal leading-snug">
            Коэффициент Пьюэлла оценивает доход майнеров биткоина: дневная эмиссия в долларах делится на её среднее значение за 365 дней. Низкие значения (зелёная зона) указывают на недооценённость и сильные зоны для покупки, высокие (красная зона) — на переоценённость и возможности для продажи.
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground text-xs">Значение</span>
        <span className="font-mono tabular text-white">
          {v.toFixed(2).replace(".", ",")} <span className="text-[11px]" style={{ color: st.color }}>{st.label}</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full" style={{ background: "linear-gradient(90deg,#22c55e 0%,#22c55e 10%,#6b7280 10%,#6b7280 80%,#ef4444 80%,#ef4444 100%)" }}>
        <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border border-background" style={{ left: `${pos}%` }} />
      </div>
    </div>
  );
};

export default PuellStatus;
