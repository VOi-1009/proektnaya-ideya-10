import { ReactNode } from "react";
import { COIN_META, Coin, fmtBig, fmtPct } from "@/lib/crypto";
import { useCmcMetrics } from "@/lib/cmcMetrics";

const fmtInt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const fmtUsd = (v?: number | null) =>
  v == null ? "—" : v >= 1e9 ? `$${(v / 1e9).toFixed(2).replace(".", ",")} млрд` : `$${(v / 1e6).toFixed(1).replace(".", ",")} млн`;

const LIQ_URL = "https://coinmarketcap.com/ru/charts/liquidations/";
const TREASURY_URL = "https://coinmarketcap.com/ru/charts/bitcoin-treasuries/";

interface Props {
  coins: Coin[];
  go: (channel: string, coinId?: string) => void;
}

interface Row {
  label: string;
  value: ReactNode;
  onClick?: () => void;
  href?: string;
}

const RowView = ({ r }: { r: Row }) => {
  const cls = "flex items-center justify-between gap-3 px-2 py-1.5 rounded transition-colors";
  const inner = (
    <>
      <span className="text-muted-foreground text-sm truncate">{r.label}</span>
      <span className="font-mono tabular text-white text-sm flex-shrink-0">{r.value}</span>
    </>
  );
  if (r.href)
    return (
      <a href={r.href} target="_blank" rel="noreferrer" className={`${cls} hover:bg-hover/60`}>
        {inner}
      </a>
    );
  if (r.onClick)
    return (
      <button onClick={r.onClick} className={`${cls} w-full text-left hover:bg-hover/60`}>
        {inner}
      </button>
    );
  return <div className={cls}>{inner}</div>;
};

const MarketSummaryList = ({ coins, go }: Props) => {
  const { data } = useCmcMetrics();
  const cryptos = coins.filter((c) => !c.kind);
  const totalCap = cryptos.reduce((s, c) => s + c.market_cap, 0);
  const btc = cryptos.find((c) => c.id === "bitcoin");
  const dominance = btc && totalCap ? (btc.market_cap / totalCap) * 100 : 0;
  const sorted = [...cryptos].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const t = data?.treasuries;
  const l = data?.liquidations;
  const share = (v?: number | null) => (l?.total && v != null ? Math.round((v / l.total) * 100) : null);
  const longPct = share(l?.longs);
  const shortPct = share(l?.shorts);

  const coinVal = (c: Coin) => (
    <>
      {COIN_META[c.id]?.short}{" "}
      <span className={c.price_change_percentage_24h >= 0 ? "text-up" : "text-down"}>{fmtPct(c.price_change_percentage_24h)}</span>
    </>
  );

  const rows: Row[] = [
    { label: "Капитализация крипто", value: fmtBig(totalCap) },
    { label: "Доминация BTC", value: `${dominance.toFixed(1).replace(".", ",")}%` },
    { label: "Сильнее рынка", value: best ? coinVal(best) : "—", onClick: best ? () => go("market", best.id) : undefined },
    { label: "Аутсайдер", value: worst ? coinVal(worst) : "—", onClick: worst ? () => go("market", worst.id) : undefined },
    { label: "Удерживаемые Bitcoin", value: t ? `${fmtInt(t.total)} BTC` : "—", href: TREASURY_URL },
    {
      label: "Ликвидации (24h)",
      value: (
        <>
          {fmtUsd(l?.total)}
          {l?.change24h != null && (
            <span className={`ml-1.5 text-[10px] ${l.change24h >= 0 ? "text-up" : "text-down"}`}>
              {l.change24h >= 0 ? "+" : ""}
              {l.change24h.toFixed(1).replace(".", ",")}%
            </span>
          )}
        </>
      ),
      href: LIQ_URL,
    },
    {
      label: "Лонг",
      value: (
        <>
          {fmtUsd(l?.longs)}
          {longPct !== null && <span className="ml-1.5 text-[10px] text-green-400">{longPct}%</span>}
        </>
      ),
      href: LIQ_URL,
    },
    {
      label: "Шорт",
      value: (
        <>
          {fmtUsd(l?.shorts)}
          {shortPct !== null && <span className="ml-1.5 text-[10px] text-red-400">{shortPct}%</span>}
        </>
      ),
      href: LIQ_URL,
    },
  ];

  return (
    <ul className="divide-y divide-border/40">
      {rows.map((r) => (
        <li key={r.label}>
          <RowView r={r} />
        </li>
      ))}
    </ul>
  );
};

export default MarketSummaryList;
