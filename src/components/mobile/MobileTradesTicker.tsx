import { Link } from "@/lib/router-compat";
import { fmtPrice } from "@/lib/crypto";
import { fundFmt, useTopFeed } from "@/lib/fund";
import { name } from "@/components/crypto/trading/shared";

const tone = (v: number) => (v >= 0 ? "text-[#16C784]" : "text-[#EA3943]");
const sgn = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fundFmt(Math.abs(v))}`;

const MobileTradesTicker = () => {
  const { data } = useTopFeed();
  const rows = (data?.feed ?? []).slice(0, 5);
  if (rows.length === 0) return null;
  return (
    <Link to="/trading" className="block rounded-xl border border-border bg-card/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Последние сделки на бирже</div>
      <div className="space-y-0.5">
        {rows.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-[11px] leading-tight">
            <span className="text-white/80 truncate flex-1 min-w-0">
              {t.name} · <span className={t.side === "long" ? "text-[#16C784]" : "text-[#EA3943]"}>{t.side === "long" ? "Купил" : "Продал"}</span> {name(t.coinId)} x{t.leverage} · {fmtPrice(t.close, t.coinId)}
            </span>
            <span className={`font-mono flex-shrink-0 ${tone(t.pnl)}`}>{sgn(t.pnl)}</span>
          </div>
        ))}
      </div>
    </Link>
  );
};

export default MobileTradesTicker;
