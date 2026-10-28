import Icon from "@/components/ui/icon";
import { useNavigate } from "@/lib/router-compat";
import { COIN_META, Coin, fmtPct, fmtPrice } from "@/lib/crypto";
import { SideBlocks } from "@/components/crypto/HomeBlocks";
import SidePolls from "@/components/crypto/SidePolls";
import ProfileMiniCard from "./ProfileMiniCard";
import { GoFn, PINNED } from "./homeConfig";

interface Props {
  sideCoins: Coin[];
  go: GoFn;
  favsCount: number;
}

const HomeRightPanel = ({ sideCoins, go, favsCount }: Props) => {
  const navigate = useNavigate();

  return (
    <aside className="hidden xl:block w-64 bg-card p-3 flex-shrink-0 space-y-5">
      <ProfileMiniCard favsCount={favsCount} />
      <button
        onClick={() => navigate("/rating")}
        className="w-full flex items-center gap-2 px-2 py-2 rounded bg-rail hover:bg-hover text-sm text-foreground"
      >
        <Icon name="Trophy" size={16} className="text-primary" />
        Рейтинг участников
        <Icon name="ChevronRight" size={14} className="ml-auto text-muted-foreground" />
      </button>
      <div>
        <h3 className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
          <Icon name="Star" size={12} /> Мой список
        </h3>
        <div className="space-y-0">
          {sideCoins.map((c) => {
            const up = c.price_change_percentage_24h >= 0;
            const pinned = PINNED.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => go("market", c.id)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-hover/60 text-left"
              >
                <div className="flex-1 min-w-0 leading-tight">
                  <div className="text-white text-sm font-medium truncate font-coin leading-tight flex items-center gap-1">
                    {COIN_META[c.id]?.ru ?? c.name}
                    {pinned && <Icon name="Pin" size={10} className="text-muted-foreground" />}
                  </div>
                  <div className="text-muted-foreground text-[10px] font-mono tabular leading-tight">
                    {fmtPrice(c.current_price, c.id)}
                    {c.id === "brent" && " / барр."}
                    {c.id === "gold" && " / унц."}
                  </div>
                </div>
                <span className={`text-xs font-mono tabular ${up ? "text-up" : "text-down"}`}>
                  {fmtPct(c.price_change_percentage_24h)}
                </span>
              </button>
            );
          })}
          {!sideCoins.length && (
            <p className="text-xs text-muted-foreground px-2">Отметьте монеты звёздочкой в #котировки</p>
          )}
        </div>
      </div>
      <SideBlocks />
      <SidePolls />
    </aside>
  );
};

export default HomeRightPanel;
