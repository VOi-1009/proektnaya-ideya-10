import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { usePref } from "@/lib/prefs";
import { COIN_IDS, COIN_META, coinShort, fmtPct, fmtPrice, isListed, useMarkets } from "@/lib/crypto";

const FIXED = ["bitcoin", "ethereum"];
const MAX_OWN = 4;
const KEY = "mobile-my-coins";
const CHOICES = COIN_IDS.filter((id) => !FIXED.includes(id));

const MobileMyCoins = () => {
  const { data, isLoading } = useMarkets();
  const [own, setOwn] = usePref<string[]>("my_coins", [], {
    legacyKey: KEY,
    parse: (v) => (Array.isArray(v) ? v.filter((id): id is string => typeof id === "string" && (CHOICES.includes(id) || isListed(id))).slice(0, MAX_OWN) : []),
  });
  const [edit, setEdit] = useState(false);

  if (isLoading || !data) return <Skeleton className="h-40 w-full bg-card" />;

  const listed = data.coins.filter((c) => c.listing);
  const choices = [...CHOICES, ...listed.map((c) => c.id)];
  const ownLive = own.filter((id) => choices.includes(id));
  const toggle = (id: string) =>
    setOwn((cur) => {
      const live = cur.filter((x) => choices.includes(x));
      return live.includes(id) ? live.filter((x) => x !== id) : live.length >= MAX_OWN ? live : [...live, id];
    });

  const ids = [...FIXED, ...ownLive];
  const rows = ids.map((id) => data.coins.find((c) => c.id === id)).filter((c) => !!c);

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon name="Star" size={15} className="text-primary" />
        <span className="text-white text-sm font-semibold flex-1">Мои монеты</span>
        <button onClick={() => setEdit(!edit)} className="text-xs text-primary inline-flex items-center gap-1">
          <Icon name={edit ? "Check" : "Pencil"} size={12} />
          {edit ? "Готово" : "Выбрать"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rows.map((c) => {
          const ch = c.price_change_percentage_24h;
          return (
            <div key={c.id} className="rounded-lg bg-rail/60 px-2.5 py-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {c.image ? (
                  <img src={c.image} alt="" className="w-4 h-4 rounded-full flex-shrink-0 object-cover" />
                ) : c.listing ? (
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.listing.color }} />
                ) : null}
                <span className="text-white text-xs font-semibold truncate">{coinShort(c)}</span>
                {c.listing && <span className="text-[8px] font-mono font-bold uppercase rounded px-1 bg-primary text-primary-foreground flex-shrink-0">new</span>}
                <span className={`ml-auto text-[11px] font-mono flex-shrink-0 ${ch >= 0 ? "text-up" : "text-down"}`}>{fmtPct(ch)}</span>
              </div>
              <div className="text-white font-mono text-sm mt-1 truncate">{fmtPrice(c.current_price, c.id)}</div>
            </div>
          );
        })}
      </div>

      {edit && (
        <div className="pt-1">
          <div className="text-[11px] text-muted-foreground mb-1.5">
            BTC и ETH показываются всегда. Выберите ещё до {MAX_OWN}: выбрано {ownLive.length} из {MAX_OWN}.
          </div>
          <div className="flex flex-wrap gap-1.5">
            {choices.map((id) => {
              const on = ownLive.includes(id);
              const locked = !on && ownLive.length >= MAX_OWN;
              const lc = listed.find((c) => c.id === id);
              return (
                <button
                  key={id}
                  disabled={locked}
                  onClick={() => toggle(id)}
                  className={`px-2.5 py-1 rounded-full border text-xs transition-colors disabled:opacity-35 ${on ? "border-primary bg-primary/15 text-white font-semibold" : "border-border text-muted-foreground"}`}
                >
                  {lc ? lc.symbol.toUpperCase() : COIN_META[id]?.short ?? id}
                  {lc && <span className="ml-1 text-[8px] font-mono font-bold uppercase text-primary">new</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMyCoins;
