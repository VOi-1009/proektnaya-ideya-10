import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { tka, useWallet } from "@/lib/tka";
import TkaIcon from "./TkaIcon";

const KIND: Record<string, string> = { daily: "Ежедневный бонус", bonus: "Бонус", reward: "Награда", refill: "Пополнение", gift: "Подарок", exchange: "Обмен", team: "Команда" };

const TkaWalletCard = ({ token }: { token: string | null }) => {
  const { data, isLoading } = useWallet(token);
  return (
    <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <TkaIcon size={22} />
        <span className="text-white font-semibold text-sm">Кошелёк TKA</span>
        <span className="ml-auto text-[11px] text-muted-foreground">1 TKA = 1 USDT</span>
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-24 w-full bg-rail" />
      ) : (
        <div className="space-y-3">
          <div>
            <div className="font-display text-3xl text-white leading-none">{tka(data.total)}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              на бирже <span className="text-white font-mono">{(data.usdt?.total ?? 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span> (виртуальные)
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Последние операции</div>
            {data.ledger.length === 0 ? (
              <p className="text-sm text-muted-foreground">Операций пока нет.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.ledger.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                    <Icon name={l.amount >= 0 ? "ArrowDownLeft" : "ArrowUpRight"} size={14} className={l.amount >= 0 ? "text-[#22C55E]" : "text-[#EA3943]"} />
                    <div className="min-w-0 flex-1">
                      <div className="text-white truncate">{l.note || KIND[l.kind] || l.kind}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {KIND[l.kind] ?? l.kind} · {new Date(l.at + "Z").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <span className={`font-mono ${l.amount >= 0 ? "text-[#22C55E]" : "text-[#EA3943]"}`}>{tka(l.amount, true)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default TkaWalletCard;
