import { Skeleton } from "@/components/ui/skeleton";
import { fmtPrice } from "@/lib/crypto";
import { useListingBook } from "@/lib/listings";

const qty = (v: number) => (v >= 1000 ? Math.round(v).toLocaleString("ru-RU") : v >= 1 ? v.toFixed(2).replace(".", ",") : v.toFixed(4).replace(".", ","));

const Side = ({ rows, coinId, color, max, reverse }: { rows: number[][]; coinId: string; color: string; max: number; reverse?: boolean }) => (
  <div className={`flex flex-col ${reverse ? "flex-col-reverse" : ""}`}>
    {rows.map(([price, amount, total]) => (
      <div key={price} className="relative grid grid-cols-3 gap-2 px-2 py-[3px] text-[11px] font-mono">
        <div className="absolute inset-y-0 right-0" style={{ width: `${Math.min(100, (total / max) * 100)}%`, background: `${color}22` }} />
        <span className="relative" style={{ color }}>{fmtPrice(price, coinId)}</span>
        <span className="relative text-right text-white">{qty(amount)}</span>
        <span className="relative text-right text-muted-foreground">{qty(total)}</span>
      </div>
    ))}
  </div>
);

const OrderBook = ({ slug }: { slug: string }) => {
  const { data } = useListingBook(slug);
  if (!data) return <Skeleton className="h-64 w-full bg-rail" />;
  const asks = data.asks.slice(0, 8);
  const bids = data.bids.slice(0, 8);
  const max = Math.max(asks[asks.length - 1]?.[2] ?? 1, bids[bids.length - 1]?.[2] ?? 1, 1);
  const spread = data.bestAsk && data.bestBid ? ((data.bestAsk - data.bestBid) / data.mid) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Цена</span>
        <span className="text-right">Объём</span>
        <span className="text-right">Всего</span>
      </div>
      <Side rows={asks} coinId={slug} color="#EA3943" max={max} reverse />
      <div className="flex items-center justify-between border-y border-border px-2 py-1.5">
        <span className="font-mono text-sm text-white">{fmtPrice(data.mid, slug)}</span>
        <span className="text-[10px] text-muted-foreground">разница {spread.toFixed(2).replace(".", ",")}%</span>
      </div>
      <Side rows={bids} coinId={slug} color="#16C784" max={max} />
      {data.trades.length > 0 && (
        <div className="pt-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1">Последние сделки</div>
          {data.trades.slice(0, 8).map((t, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 px-2 py-[2px] text-[11px] font-mono">
              <span style={{ color: t.side === "long" ? "#16C784" : "#EA3943" }}>{fmtPrice(t.price, slug)}</span>
              <span className="text-right text-white">{qty(t.qty)}</span>
              <span className="text-right text-muted-foreground">{new Date(t.at + "Z").toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderBook;
