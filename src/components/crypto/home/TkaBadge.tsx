import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Daily, TRADING_URL, useDaily, useWallet } from "@/lib/tka";
import TkaIcon from "@/components/crypto/TkaIcon";
import { GoFn } from "./homeConfig";

const TkaBadge = ({ go }: { go: GoFn }) => {
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const { data } = useWallet(user ? token : null);
  const { data: daily } = useDaily(user ? token : null);
  const [busy, setBusy] = useState(false);
  if (!user || !data) return null;

  const claim = async () => {
    setBusy(true);
    try {
      const r = await fetch(TRADING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token ?? "" },
        body: JSON.stringify({ action: "daily" }),
      });
      const d = (await r.json().catch(() => ({}))) as Daily & { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Не удалось забрать бонус");
      qc.setQueryData(["tka-daily", token], d);
      qc.invalidateQueries({ queryKey: ["tka-wallet"] });
      qc.invalidateQueries({ queryKey: ["trading"] });
      toast({ title: `+${d.got} TKA`, description: `Ежедневный бонус, день ${d.streak} подряд. Завтра будет больше.` });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        onClick={() => go("trading")}
        title="Кошелёк TKA — внутренняя игровая монета, 1 TKA = 1 USDT"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rail rounded-lg hover:bg-hover transition-colors"
      >
        <TkaIcon size={18} />
        <span className="font-mono text-sm text-white">{Math.round(data.total).toLocaleString("ru-RU")}</span>
        <span className="text-[10px] font-semibold text-primary">TKA</span>
      </button>
      {daily && !daily.claimed && (
        <button
          onClick={claim}
          disabled={busy}
          title={`Ежедневный бонус: день ${daily.nextDay} подряд. Чем больше дней подряд, тем больше награда`}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-60 animate-pulse"
        >
          <Icon name="Gift" size={14} />
          Забрать +{daily.reward}
        </button>
      )}
      {daily?.claimed && (
        <span
          title={`Бонус получен. Серия: ${daily.streak} дн. подряд. Завтра: +${daily.tomorrow} TKA`}
          className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rail text-[11px] text-muted-foreground"
        >
          <Icon name="Flame" size={13} className="text-primary" />
          {daily.streak} дн.
        </span>
      )}
    </div>
  );
};

export default TkaBadge;
