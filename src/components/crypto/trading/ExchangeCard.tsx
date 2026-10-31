import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TkaIcon from "@/components/crypto/TkaIcon";
import { useAuth } from "@/lib/auth";
import { TRADING_URL, Wallet } from "@/lib/tka";
import { Send, State } from "./shared";

const FEE = 0.0005;
const fmt = (v: number, d = 2) => v.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });

const ExchangeCard = ({ st, busy, send, token }: { st: State | undefined; busy: boolean; send: Send; token: string | null }) => {
  const { user } = useAuth();
  const [dir, setDir] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const { data: wallet } = useQuery<Wallet>({
    queryKey: ["tka-wallet", token],
    enabled: !!token,
    staleTime: 30_000,
    queryFn: async () => {
      const r = await fetch(`${TRADING_URL}?action=wallet`, { headers: { "X-Auth-Token": token ?? "" } });
      if (!r.ok) throw new Error("bad");
      return r.json();
    },
  });

  const tkaFree = wallet?.total ?? 0;
  const usdtFree = st?.balance ?? 0;
  const max = dir === "in" ? tkaFree : usdtFree;
  const value = Number(amount) || 0;
  const fee = value * FEE;
  const get = value - fee;
  const can = !!user && !busy && value >= 1 && value <= max + 1e-9;
  const give = dir === "in" ? "TKA" : "USDT (виртуальные)";
  const take = dir === "in" ? "USDT (виртуальные)" : "TKA";

  const tab = (active: boolean) =>
    `flex-1 h-7 rounded-md text-xs font-semibold transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-rail/60 text-muted-foreground hover:text-white"}`;

  return (
    <section className="rounded-xl border border-border bg-card p-3 space-y-2">
      <h3 className="font-display text-sm text-white flex items-center gap-2">
        <Icon name="ArrowRightLeft" size={15} className="text-primary" /> Обменник
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">1 TKA = 1 USDT</span>
      </h3>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-rail/50 px-2 py-1.5 min-w-0">
          <div className="text-muted-foreground flex items-center gap-1"><TkaIcon size={12} /> Кошелёк TKA</div>
          <div className="font-mono text-white truncate">{wallet ? fmt(tkaFree) : "—"}</div>
        </div>
        <div className="rounded-lg bg-rail/50 px-2 py-1.5 min-w-0">
          <div className="text-muted-foreground">USDT для игры</div>
          <div className="font-mono text-white truncate">{st ? fmt(usdtFree) : "—"}</div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button type="button" className={tab(dir === "in")} onClick={() => { setDir("in"); setAmount(""); }}>TKA → USDT</button>
        <button type="button" className={tab(dir === "out")} onClick={() => { setDir("out"); setAmount(""); }}>USDT → TKA</button>
      </div>

      <div className="flex gap-1.5">
        <Input type="number" min={1} className="h-8 text-sm flex-1 min-w-0" placeholder={`Отдаёте, ${give}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={max < 1} onClick={() => setAmount(String(Math.floor(max * 100) / 100))}>
          Всё
        </Button>
      </div>

      {value > 0 && (
        <div className="rounded-lg bg-rail/50 px-2 py-1.5 text-[11px] space-y-0.5">
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Комиссия 0,05% (в фонд)</span><span className="font-mono text-white">{fmt(fee, 4)}</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Вы получите, {take}</span><span className="font-mono text-white">{fmt(get, 4)}</span></div>
        </div>
      )}

      <Button
        className="w-full h-9 font-semibold"
        disabled={!can}
        onClick={() =>
          send(
            { action: dir === "in" ? "exchange" : "withdraw", amount: value },
            `Получено ${fmt(get)} ${dir === "in" ? "USDT (виртуальных)" : "TKA"}`,
          ).then(() => setAmount(""))
        }
      >
        {dir === "in" ? "Обменять на USDT (виртуальные)" : "Обменять на TKA"}
      </Button>
      {dir === "out" && <p className="text-[10px] text-muted-foreground">Обменять можно только свободные USDT: деньги в сделках и ордерах не участвуют.</p>}
      {dir === "in" && user && wallet && tkaFree < 1 && <p className="text-[10px] text-muted-foreground">Нужны TKA: забирайте ежедневный бонус и получайте награды за достижения.</p>}
    </section>
  );
};

export default ExchangeCard;
