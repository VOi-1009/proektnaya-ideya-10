import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router-compat";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/tka";
import TkaIcon from "@/components/crypto/TkaIcon";
import { State, TRADING_API } from "@/components/crypto/trading/shared";

const num = (v: number, sign = false) =>
  `${sign && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MobileWalletMini = () => {
  const { token, user } = useAuth();
  const { data: w } = useWallet(token);
  const { data: st } = useQuery<State>({
    queryKey: ["trading", token],
    enabled: !!token,
    refetchInterval: 20_000,
    queryFn: async () => {
      const r = await fetch(TRADING_API, { headers: { "X-Auth-Token": token ?? "" } });
      if (!r.ok) throw new Error("bad");
      return r.json();
    },
  });

  if (!user) return null;
  const pnl = st ? st.equity - st.start : null;
  const up = (pnl ?? 0) >= 0;

  return (
    <Link to="/profile" className="block rounded-xl border border-border bg-card/60 px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <TkaIcon size={14} />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Кошелёк TKA</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="min-w-0 text-center">
          <div className="text-[10px] text-muted-foreground leading-none">TKA</div>
          <div className="text-white font-mono text-xs mt-1 truncate">{w ? num(w.total) : "—"}</div>
        </div>
        <div className="min-w-0 text-center">
          <div className="text-[10px] text-muted-foreground leading-none">USDT</div>
          <div className="text-white font-mono text-xs mt-1 truncate">{w ? num(w.usdt?.total ?? 0) : "—"}</div>
        </div>
        <div className="min-w-0 text-center">
          <div className="text-[10px] text-muted-foreground leading-none">Общий PnL</div>
          <div className={`font-mono text-xs mt-1 truncate ${pnl === null ? "text-white" : up ? "text-[#16C784]" : "text-[#EA3943]"}`}>{pnl === null ? "—" : num(pnl, true)}</div>
        </div>
      </div>
    </Link>
  );
};

export default MobileWalletMini;
