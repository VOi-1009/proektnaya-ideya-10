import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRadars } from "@/lib/radars";
import LiqHeatmap from "../LiqHeatmap";
import TopTxsTable from "../TopTxsTable";
import RadarPage from "../RadarPage";

const RadarChannel = ({ id }: { id: number }) => {
  const { data: radars, isLoading } = useRadars();
  const radar = radars?.find((r) => r.id === id);

  if (isLoading) return <Skeleton className="h-96 w-full bg-card" />;
  if (!radar)
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center max-w-lg mx-auto mt-6">
        <Icon name="Radar" size={28} className="mx-auto text-muted-foreground mb-3" fallback="Radio" />
        <h3 className="text-white font-semibold">Радар не найден</h3>
        <p className="text-muted-foreground text-sm mt-1.5">Возможно, его скрыл администратор.</p>
      </div>
    );

  return (
    <div className="space-y-3 animate-fade-in">
      {radar.description && <p className="text-muted-foreground text-sm">{radar.description}</p>}
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
        {radar.kind === "liq_heatmap" ? (
          <LiqHeatmap symbol={radar.symbol} />
        ) : radar.kind === "top_txs" ? (
          <TopTxsTable color={radar.color} />
        ) : radar.kind === "page" ? (
          <div>
            {radar.pageTitle && <h1 className="font-display text-2xl sm:text-3xl text-white mb-3">{radar.pageTitle}</h1>}
            <RadarPage html={radar.pageHtml} />
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <Icon name="Radar" size={40} style={{ color: radar.color }} fallback="Radio" />
            <p className="text-sm text-muted-foreground max-w-md">Этот радар работает на внешнем сайте и откроется в новой вкладке.</p>
            <Button asChild className="font-semibold">
              <a href={radar.url} target="_blank" rel="noopener noreferrer">
                Открыть <Icon name="ExternalLink" size={14} className="ml-1.5" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RadarChannel;
