import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { fmtPrice } from "@/lib/crypto";
import { useListings, untilText } from "@/lib/listings";

const ListingSoon = () => {
  const { data } = useListings();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const soon = (data?.items ?? []).filter((l) => l.status === "scheduled" && l.listingAt);
  if (!soon.length) return null;

  return (
    <section className="rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-card to-card p-3 space-y-2">
      <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
        <Icon name="Rocket" size={15} className="text-primary" /> Скоро на бирже
      </h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {soon.map((l) => (
          <div key={l.id} className="rounded-lg bg-rail/70 p-2.5 flex items-center gap-3">
            {l.iconUrl ? (
              <img src={l.iconUrl} alt={l.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono font-bold text-black flex-shrink-0" style={{ background: l.color }}>
                {l.symbol.slice(0, 3)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-semibold truncate">{l.name} <span className="text-muted-foreground font-mono text-xs">{l.symbol}</span></div>
              <div className="text-[11px] text-muted-foreground">Старт цены {fmtPrice(l.startPrice, l.slug)} · плечо до x{l.maxLeverage}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] text-muted-foreground">старт через</div>
              <div className="font-mono text-sm text-primary">{untilText(l.listingAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ListingSoon;
