import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sentimentLabel, useCmcMetrics } from "@/lib/cmcMetrics";

const fmt = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}`;
const color = (v: number) => (v > 0.5 ? "#22c55e" : v < -0.5 ? "#ef4444" : "#9ca3af");

const Row = ({ label, value }: { label: string; value: number | null | undefined }) => (
  <div className="flex items-baseline justify-between gap-2 text-sm">
    <span className="text-muted-foreground text-xs">{label}</span>
    {value != null ? (
      <span className="font-mono tabular" style={{ color: color(value) }}>
        {fmt(value)}
      </span>
    ) : (
      <span className="text-muted-foreground text-xs">—</span>
    )}
  </div>
);

const SocialSentiment = () => {
  const { data, isLoading, isError } = useCmcMetrics();
  const s = data?.social;

  if (isLoading) return <Skeleton className="w-full h-full min-h-[80px] bg-rail" />;
  if (isError || !s || s.value == null) return <div className="p-3 text-xs text-muted-foreground">Данные временно недоступны</div>;

  return (
    <div className="h-full p-3 flex flex-col justify-center gap-0.5">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
        <Icon name="MessagesSquare" size={12} className="text-primary" /> Упоминания в соцсетях
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Что такое общее настроение" className="text-primary animate-soft-blink hover:animate-none hover:opacity-100 normal-case">
              <Icon name="Info" size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-xs font-normal normal-case tracking-normal leading-snug">
            Общее настроение отражает тон обсуждений криптовалют в соцсетях по шкале от -10 до +10: от негативного до позитивного.
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground text-xs">Общее настроение</span>
        <span className="font-mono tabular text-white">
          <span style={{ color: color(s.value) }}>{fmt(s.value)}</span>{" "}
          <span className="text-[11px] text-muted-foreground">{sentimentLabel(s.value)}</span>
        </span>
      </div>
      <Row label="Вчера" value={s.yesterday} />
      <Row label="Неделю назад" value={s.lastWeek} />
    </div>
  );
};

export default SocialSentiment;
