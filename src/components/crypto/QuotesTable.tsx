import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Coin, COIN_META, fmtBig, fmtPct, fmtPrice } from "@/lib/crypto";
import Sparkline from "./Sparkline";

type SortKey = "market_cap" | "current_price" | "price_change_percentage_24h" | "price_change_percentage_7d_in_currency";

interface Props {
  coins: Coin[];
  selected: string;
  onSelect: (id: string) => void;
}

const COMMODITY_ICON: Record<string, string> = { brent: "Droplet", gold: "Gem", silver: "Gem", natgas: "Flame", palladium: "Gem" };

const CoinLogo = ({ coin, size = 28 }: { coin: Coin; size?: number }) => {
  const meta = COIN_META[coin.id];
  const [failed, setFailed] = useState(false);
  if (COMMODITY_ICON[coin.id])
    return (
      <div
        className="rounded-full flex items-center justify-center text-white flex-shrink-0"
        style={{ width: size, height: size, background: meta?.color ?? "#888" }}
      >
        <Icon name={COMMODITY_ICON[coin.id]} size={Math.round(size * 0.55)} />
      </div>
    );
  if (!failed && !coin.kind)
    return (
      <img
        src={`/coins/${coin.id}.png`}
        alt={coin.name}
        width={size}
        height={size}
        className="rounded-full"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  return (
    <div
      className="rounded-full flex items-center justify-center font-mono font-bold text-[9px] text-black"
      style={{ width: size, height: size, background: meta?.color ?? "#888" }}
    >
      {coin.symbol.slice(0, 3).toUpperCase()}
    </div>
  );
};

export { CoinLogo };

const QuotesTable = ({ coins, selected, onSelect }: Props) => {
  const [sort, setSort] = useState<SortKey>("market_cap");
  const [dir, setDir] = useState<1 | -1>(-1);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    let list = [...coins];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.symbol.toLowerCase().includes(s) ||
          COIN_META[c.id]?.ru.toLowerCase().includes(s) ||
          COIN_META[c.id]?.short.toLowerCase().includes(s)
      );
    }
    return list.sort((a, b) => ((a[sort] ?? 0) - (b[sort] ?? 0)) * dir);
  }, [coins, sort, dir, q]);

  const head = (key: SortKey, label: string, cls = "") => (
    <th className={`px-3 py-2 font-medium text-right ${cls}`}>
      <button
        onClick={() => {
          if (sort === key) setDir(dir === 1 ? -1 : 1);
          else {
            setSort(key);
            setDir(-1);
          }
        }}
        className={`inline-flex items-center gap-1 hover:text-white ${sort === key ? "text-white" : ""}`}
      >
        {label}
        {sort === key && <Icon name={dir === -1 ? "ChevronDown" : "ChevronUp"} size={12} />}
      </button>
    </th>
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
        <div className="flex items-center gap-2 bg-rail rounded px-2 py-1.5 flex-1 min-w-[160px]">
          <Icon name="Search" size={14} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Найти монету: btc, тон, солана..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-muted-foreground text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Монета</th>
              {head("current_price", "Цена")}
              {head("price_change_percentage_24h", "24ч")}
              {head("price_change_percentage_7d_in_currency", "7д", "hidden sm:table-cell")}
              {head("market_cap", "Капитализация", "hidden md:table-cell")}
              <th className="px-3 py-2 text-right font-medium">Неделя</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const up24 = c.price_change_percentage_24h >= 0;
              const up7 = (c.price_change_percentage_7d_in_currency ?? 0) >= 0;
              return (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`border-t border-white/5 cursor-pointer transition-colors ${
                    selected === c.id ? "bg-primary/10" : "hover:bg-hover/60"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <CoinLogo coin={c} />
                      <div>
                        <div className="text-white font-medium leading-tight font-coin">{COIN_META[c.id]?.ru ?? c.name}</div>
                        <div className="text-muted-foreground text-xs font-mono">{COIN_META[c.id]?.short ?? c.symbol.toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-white tabular">{fmtPrice(c.current_price, c.id)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono tabular ${up24 ? "text-up" : "text-down"}`}>
                    {fmtPct(c.price_change_percentage_24h)}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono tabular hidden sm:table-cell ${up7 ? "text-up" : "text-down"}`}>
                    {fmtPct(c.price_change_percentage_7d_in_currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground tabular hidden md:table-cell">
                    {c.market_cap ? fmtBig(c.market_cap) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      <Sparkline data={c.sparkline_in_7d?.price ?? []} up={up7} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  Ничего не нашлось. Попробуйте другой тикер.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotesTable;
