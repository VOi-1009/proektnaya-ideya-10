import { useMemo, useState } from "react";
import { ExchangeFlow, fmtUsd, useExchangeFlows } from "@/lib/radars";
import { cardCls, labelCls } from "./summaryCard";

const Logo = ({ e }: { e: ExchangeFlow }) => {
  const [err, setErr] = useState(false);
  const tip = `${e.name}: отток ${fmtUsd(Math.abs(e.flow24h))} за 24 часа`;
  return e.id && !err ? (
    <img
      src={`/exchanges/${e.id}.png`}
      alt={e.name}
      title={tip}
      width={24}
      height={24}
      className="w-6 h-6 rounded-full bg-white/5 flex-shrink-0"
      onError={() => setErr(true)}
    />
  ) : (
    <span title={tip} className="w-6 h-6 rounded-full bg-rail text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
      {e.name.slice(0, 2).toUpperCase()}
    </span>
  );
};

const ExchangeOutflowCard = () => {
  const { data } = useExchangeFlows(true);
  const top = useMemo(() => {
    const byAssets = (data?.items ?? []).filter((e) => e.assets > 0).sort((a, b) => b.assets - a.assets).slice(0, 20);
    return byAssets.filter((e) => e.flow24h < 0).sort((a, b) => a.flow24h - b.flow24h).slice(0, 3);
  }, [data]);

  return (
    <div className={`${cardCls("border-metric-gold")} items-center`} title="Биржи с самым большим оттоком активов за 24 часа">
      <div className={`${labelCls} text-center line-clamp-1`}>Больше всего оттока за 24ч</div>
      <div className="flex items-center justify-center gap-2 mt-1 w-full">
        {top.length ? top.map((e) => <Logo key={e.slug || e.name} e={e} />) : <span className="text-muted-foreground text-sm">—</span>}
      </div>
    </div>
  );
};

export default ExchangeOutflowCard;
