import Icon from "@/components/ui/icon";
import { fmtPrice } from "@/lib/crypto";
import { useListings, untilText } from "@/lib/listings";

const PremarketCard = () => {
  const { data } = useListings();
  const items = (data?.items ?? []).filter((l) => l.premarket && (l.status === "scheduled" || l.status === "trading" || l.status === "halted"));

  return (
    <section className="rounded-xl border border-border bg-card p-3 space-y-2">
      <h3 className="font-display text-sm text-white flex items-center gap-1.5"><Icon name="Hourglass" size={15} className="text-primary" /> Премаркет</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Премаркет-токенов пока нет. Здесь появятся будущие монеты, которые можно торговать до официального запуска.</p>
      ) : (
        <div className="space-y-2">
          {items.map((l) => (
            <div key={l.id} className="rounded-lg bg-rail/70 p-2.5 flex items-center gap-2.5">
              {l.iconUrl ? (
                <img src={l.iconUrl} alt={l.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-black flex-shrink-0" style={{ background: l.color }}>{l.symbol.slice(0, 3)}</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm font-semibold truncate">{l.name} <span className="text-muted-foreground font-mono text-xs">{l.symbol}</span></div>
                <div className="text-[11px] text-muted-foreground">{fmtPrice(l.price, l.slug)} · плечо до x{l.maxLeverage}</div>
              </div>
              <div className="text-right flex-shrink-0 text-[11px]">
                {l.status === "scheduled" && l.listingAt ? (<><div className="text-muted-foreground">старт через</div><div className="font-mono text-primary">{untilText(l.listingAt)}</div></>) : <div className="text-[#22C55E]">Торгуется</div>}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground leading-snug">Премаркет: токен ещё не вышел на биржи, цена может сильно меняться.</p>
        </div>
      )}
    </section>
  );
};

export default PremarketCard;
