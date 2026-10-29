import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtUsd, LiqLevel, useLiqMap } from "@/lib/radars";

const fmtP = (p: number) => `$${Math.round(p).toLocaleString("ru-RU")}`;
const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`;

const Row = ({ label, level, color }: { label: string; level: LiqLevel | null; color: string }) => (
  <div className="flex items-baseline justify-between gap-2 text-sm">
    <span className="text-muted-foreground text-xs">{label}</span>
    {level ? (
      <span className="font-mono text-white tabular">
        {fmtP(level.price)} <span className="text-[11px]" style={{ color }}>{fmtPct(level.pct)}</span>
      </span>
    ) : (
      <span className="text-muted-foreground text-xs">Нет близких уровней</span>
    )}
  </div>
);

const LiqInsights = ({ symbol = "BTCUSDT" }: { symbol?: string }) => {
  const { data, isLoading, isError } = useLiqMap(symbol, "30d", "all", true);

  if (isLoading) return <Skeleton className="w-full h-full min-h-[100px] bg-rail" />;
  if (isError || !data) return <div className="p-3 text-xs text-muted-foreground">Данные Binance временно недоступны</div>;

  return (
    <div className="h-full p-3 flex flex-col justify-center gap-3">
      <div>
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
          <Icon name="Target" size={12} className="text-primary" /> Ключевые уровни ликвидации
        </div>
        <div className="space-y-1">
          <Row label="Выше цены" level={data.keyAbove} color="#ef4444" />
          <Row label="Ниже цены" level={data.keyBelow} color="#22c55e" />
        </div>
      </div>
      <div>
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
          <Icon name="Magnet" size={12} className="text-primary" /> Largest Magnet Zone
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Что такое Largest Magnet Zone" className="text-primary animate-soft-blink hover:animate-none hover:opacity-100 normal-case">
                <Icon name="Info" size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-xs font-normal normal-case tracking-normal leading-snug">
              Largest Magnet Zone - это цена, при которой будет ликвидировано наибольшее количество позиций одновременно. Цена часто притягивается к ней.
            </TooltipContent>
          </Tooltip>
        </div>
        {data.magnet ? (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground text-xs">Уровень цен</span>
              <span className="font-mono text-white tabular">
                {fmtP(data.magnet.price)} <span className="text-[11px] text-primary">{fmtPct(data.magnet.pct)}</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground text-xs">Возможные ликвидации</span>
              <span className="font-mono text-white tabular">{fmtUsd(data.magnet.usd)}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Нет данных</div>
        )}
      </div>
    </div>
  );
};

export default LiqInsights;
