import { Coin, COIN_META, fmtPct, fmtPrice } from "@/lib/crypto";

const Ticker = ({ coins, onPick }: { coins: Coin[]; onPick: (id: string) => void }) => {
  const row = [...coins, ...coins];
  return (
    <div className="relative overflow-hidden bg-rail border-b border-border">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]" style={{ animationDuration: `${Math.max(60, coins.length * 6)}s` }}>
        {row.map((c, i) => {
          const up = c.price_change_percentage_24h >= 0;
          return (
            <button
              key={`${c.id}-${i}`}
              onClick={() => onPick(c.id)}
              className="flex items-center gap-2 px-5 py-1.5 font-mono text-xs border-r border-white/5 hover:bg-hover transition-colors"
            >
              <span className="text-muted-foreground">{COIN_META[c.id]?.short ?? c.symbol.toUpperCase()}</span>
              <span className="text-white tabular">{fmtPrice(c.current_price, c.id)}</span>
              <span className={`tabular ${up ? "text-up" : "text-down"}`}>
                {up ? "▲" : "▼"} {fmtPct(c.price_change_percentage_24h)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Ticker;
