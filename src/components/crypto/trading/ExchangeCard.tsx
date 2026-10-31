import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TkaIcon from "@/components/crypto/TkaIcon";
import { useAuth } from "@/lib/auth";
import { TRADING_URL, Wallet } from "@/lib/tka";
import { Send, State } from "./shared";

const fmt = (v: number) => v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ExchangeCard = ({ st, busy, send, token }: { st: State | undefined; busy: boolean; send: Send; token: string | null }) => {
  const { user } = useAuth();
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
  const value = Number(amount) || 0;
  const can = !!user && !busy && value >= 1 && value <= tkaFree + 1e-9;

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
          <div className="font-mono text-white truncate">{st ? fmt(st.balance) : "—"}</div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <Input type="number" min={1} className="h-8 text-sm flex-1 min-w-0" placeholder="Сколько TKA обменять" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={!wallet || tkaFree < 1} onClick={() => setAmount(String(Math.floor(tkaFree * 100) / 100))}>
          Всё
        </Button>
      </div>

      <Button
        className="w-full h-9 font-semibold"
        disabled={!can}
        onClick={() => send({ action: "exchange", amount: value }, `Получено ${fmt(value)} USDT (виртуальных)`).then(() => setAmount(""))}
      >
        Обменять на USDT (виртуальные)
      </Button>
      {user && wallet && tkaFree < 1 && <p className="text-[10px] text-muted-foreground">Нужны TKA: забирайте ежедневный бонус и получайте награды за достижения.</p>}
    </section>
  );
};

export default ExchangeCard;
