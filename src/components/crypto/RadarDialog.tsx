import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Radar } from "@/lib/radars";
import LiqHeatmap from "./LiqHeatmap";

const RadarDialog = ({ radar, onClose }: { radar: Radar | null; onClose: () => void }) => (
  <Dialog open={!!radar} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="bg-card border-border max-w-5xl w-[calc(100vw-1.5rem)] max-h-[92vh] overflow-y-auto">
      {radar && (
        <>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-left">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: radar.color, boxShadow: `0 0 10px ${radar.color}` }} />
              {radar.title}
              {radar.kind === "liq_heatmap" && <span className="text-muted-foreground font-mono text-sm font-normal">{radar.symbol}</span>}
            </DialogTitle>
            {radar.description && <DialogDescription className="text-left">{radar.description}</DialogDescription>}
          </DialogHeader>
          {radar.kind === "liq_heatmap" ? (
            <LiqHeatmap symbol={radar.symbol} />
          ) : (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <Icon name="Radar" size={40} style={{ color: radar.color }} fallback="Radio" />
              <p className="text-sm text-muted-foreground max-w-md">Этот радар открывается на внешнем сайте в новой вкладке.</p>
              <Button asChild className="font-semibold">
                <a href={radar.url} target="_blank" rel="noopener noreferrer">
                  Открыть <Icon name="ExternalLink" size={14} className="ml-1.5" />
                </a>
              </Button>
            </div>
          )}
        </>
      )}
    </DialogContent>
  </Dialog>
);

export default RadarDialog;
