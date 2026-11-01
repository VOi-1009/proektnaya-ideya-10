import Icon from "@/components/ui/icon";
import { Link } from "@/lib/router-compat";
import { MobileBlock } from "@/lib/fund";
import { useMarkets } from "@/lib/crypto";
import MarketSummary from "@/components/crypto/home/MarketSummary";
import { useNavigate } from "@/lib/router-compat";
import BullBearMini from "./BullBearMini";
import { Skeleton } from "@/components/ui/skeleton";

const MarketSummaryBlock = () => {
  const { data, isLoading } = useMarkets();
  const navigate = useNavigate();
  if (isLoading || !data) return <Skeleton className="h-64 w-full bg-card" />;
  return (
    <div className="rounded-xl border border-border bg-card p-2 flex flex-col gap-2">
      <MarketSummary coins={data.coins} go={() => navigate("/")} cols={2} hideOutflow />
    </div>
  );
};

const MobileBlockView = ({ block: b, preview }: { block: MobileBlock; preview?: boolean }) => {
  if (b.kind === "market_summary") return <MarketSummaryBlock />;
  if (b.kind === "bullbear") return <BullBearMini />;
  if (b.kind === "empty") {
    if (!preview) return null;
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 min-h-[96px] flex items-center justify-center text-xs text-muted-foreground">
        Пустой блок
      </div>
    );
  }
  const body = (
    <div className={`rounded-xl border p-3 ${b.kind === "banner" ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {b.title && <div className="text-white font-semibold text-sm leading-snug">{b.title}</div>}
          {b.text && <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 whitespace-pre-line">{b.text}</p>}
        </div>
        {b.kind === "link" && b.url && <Icon name="ChevronRight" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />}
      </div>
    </div>
  );
  if (!b.url) return body;
  return b.url.startsWith("/") ? (
    <Link to={b.url} className="block">{body}</Link>
  ) : (
    <a href={b.url} target="_blank" rel="noreferrer" className="block">{body}</a>
  );
};

export default MobileBlockView;
