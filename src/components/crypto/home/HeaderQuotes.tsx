import { Coin, COIN_META, fmtPct, fmtPrice } from "@/lib/crypto";
import { GoFn } from "./homeConfig";

const HERO_QUOTES = ["bitcoin", "ethereum", "brent", "gold", "usd-rub", "eur-rub"];

interface Props {
  coins: Coin[];
  go: GoFn;
}

const HeaderQuotes = ({ coins, go }: Props) => {
  const list = HERO_QUOTES.map((id) => coins.find((c) => c.id === id)).filter((c): c is Coin => !!c);
  if (!list.length) return null;

  return (
    <div className="hidden md:flex items-center gap-3 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {list.map((c) => {
        const up = c.price_change_percentage_24h >= 0;
        return (
          <button
            key={c.id}
            onClick={() => go("market", c.id)}
            className="flex items-baseline gap-1.5 flex-shrink-0 text-xs font-mono tabular hover:text-white transition-colors"
            title={COIN_META[c.id]?.ru ?? c.name}
          >
            <span className="text-foreground font-coin font-medium">{COIN_META[c.id]?.short ?? c.name}</span>
            <span className="text-white/90">{fmtPrice(c.current_price, c.id)}</span>
            <span className={up ? "text-up" : "text-down"}>{fmtPct(c.price_change_percentage_24h)}</span>
          </button>
        );
      })}
    </div>
  );
};

export default HeaderQuotes;
