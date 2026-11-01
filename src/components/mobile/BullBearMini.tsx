import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { fundFmt, fundRequest, GamesConfig, useGamesConfig } from "@/lib/fund";

const usd = (v: number) => `$${v.toLocaleString("ru-RU", { maximumFractionDigits: v < 10 ? 4 : 2 })}`;
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const mx = (v: number) => `x${String(v).replace(".", ",")}`;

const BullBearMini = () => {
  const { user, token, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useGamesConfig(token);
  const [bet, setBet] = useState("5");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const activeId = data?.bb?.active?.id;
  const activeLeft = data?.bb?.active?.left ?? 0;

  useEffect(() => {
    if (!activeId) return;
    setLeft(activeLeft);
    const t = setInterval(() => setLeft((v) => Math.max(v - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [activeId, activeLeft]);

  useEffect(() => {
    if (!activeId) return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["games-config", token] });
      qc.invalidateQueries({ queryKey: ["tka-wallet"] });
    }, 15000);
    return () => clearInterval(t);
  }, [activeId, qc, token]);

  useEffect(() => {
    if (activeId && left === 0) {
      const t = setTimeout(() => qc.invalidateQueries({ queryKey: ["games-config", token] }), 2500);
      return () => clearTimeout(t);
    }
  }, [activeId, left, qc, token]);

  if (isLoading || !data) return <Skeleton className="h-52 w-full bg-card" />;
  const st = data.settings;
  if (!st.games.bullbear) return null;
  const me = data.me;
  const bb = data.bb;
  const a = bb?.active;
  const last = bb?.last;
  const amount = Number(bet) || 0;
  const closed = !st.enabled;
  const disabled = busy || closed || !!me?.locked || me?.left === 0 || amount < st.minBet || amount > Math.min(st.maxBet, data.mults.bullbear.maxBet);

  const start = async (side: "bull" | "bear") => {
    if (!user) return setAuthOpen(true);
    setBusy(true);
    try {
      const next = await fundRequest<GamesConfig>(token, "", { action: "games_bb_start", side, bet: amount });
      qc.setQueryData(["games-config", token], next);
      qc.invalidateQueries({ queryKey: ["tka-wallet"] });
      qc.invalidateQueries({ queryKey: ["tka-fund"] });
      toast({ title: side === "bull" ? "Ставка на рост принята" : "Ставка на падение принята" });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const diff = a && bb?.price ? ((bb.price - a.entry) / a.entry) * 100 : null;
  const winning = diff === null || !a ? null : a.side === "bull" ? diff > 0 : diff < 0;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Icon name="TrendingUp" size={16} className="text-primary" />
        <h3 className="text-white font-semibold text-sm">Бык или медведь</h3>
        {bb?.price && <span className="ml-auto text-[11px] text-muted-foreground">BTC <span className="font-mono text-white">{usd(bb.price)}</span></span>}
      </div>

      {closed ? (
        <p className="text-xs text-muted-foreground">{st.message || "Мини-игры временно закрыты."}</p>
      ) : a ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-center space-y-1">
          <div className="text-[11px] text-muted-foreground">Ставка {fundFmt(a.bet)} TKA на {a.side === "bull" ? "рост" : "падение"}</div>
          <div className="font-display text-2xl text-white">{a.overdue || left === 0 ? "Считаем итог…" : clock(left)}</div>
          <div className="flex justify-center gap-3 text-[11px] font-mono">
            <span className="text-muted-foreground">Старт {usd(a.entry)}</span>
            {bb?.price && diff !== null && (
              <span className={winning ? "text-[#22C55E]" : "text-[#EA3943]"}>{diff > 0 ? "+" : ""}{diff.toFixed(3).replace(".", ",")}%</span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">Выигрыш {fundFmt(a.bet * a.mult)} TKA</div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex-shrink-0">Ставка, TKA</span>
            <Input type="number" min={st.minBet} max={st.maxBet} value={bet} onChange={(e) => setBet(e.target.value)} className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={disabled} onClick={() => start("bull")} className="rounded-xl border border-[#22C55E]/50 bg-[#22C55E]/10 active:bg-[#22C55E]/20 disabled:opacity-50 p-2 flex flex-col items-center gap-0.5">
              <img src="/icons/bull.png" alt="" className="w-12 h-12 rounded-lg" />
              <span className="text-xs font-bold text-[#22C55E]">Бык: вырастет</span>
              <span className="text-[10px] font-mono text-muted-foreground">{mx(data.mults.bullbear.mult)}</span>
            </button>
            <button disabled={disabled} onClick={() => start("bear")} className="rounded-xl border border-[#EA3943]/50 bg-[#EA3943]/10 active:bg-[#EA3943]/20 disabled:opacity-50 p-2 flex flex-col items-center gap-0.5">
              <img src="/icons/bear.png" alt="" className="w-12 h-12 rounded-lg" />
              <span className="text-xs font-bold text-[#EA3943]">Медведь: упадёт</span>
              <span className="text-[10px] font-mono text-muted-foreground">{mx(data.mults.bullbear.mult)}</span>
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Итог через {data.mults.bullbear.minutes} мин: цена выше стартовой — выигрывает бык, ниже — медведь. Игра на игровую монету, не на деньги.
            {!user && " Чтобы играть, войдите."}
            {me?.locked && " Игры доступны со статуса выше вашего."}
          </p>
          {last && (
            <div className={`rounded-lg border px-2 py-1.5 text-center text-xs ${last.status === "win" ? "border-[#22C55E]/50 text-[#22C55E]" : last.status === "void" ? "border-border text-muted-foreground" : "border-[#EA3943]/40 text-[#EA3943]"}`}>
              {last.status === "win" ? `Угадали: +${fundFmt(last.payout - last.bet)} TKA` : last.status === "void" ? "Цена не изменилась, ставка вернулась" : `Не угадали: −${fundFmt(last.bet)} TKA`}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BullBearMini;
