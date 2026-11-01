import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { fundFmt, fundRequest, GamesConfig, useGamesConfig } from "@/lib/fund";
import TkaIcon from "../TkaIcon";

type Game = "coin" | "dice" | "wheel" | "rocket" | "bullbear";
const GAME_COLOR: Record<Game, string> = { coin: "#FBBF24", dice: "#38BDF8", wheel: "#D946EF", rocket: "#EF4444", bullbear: "#22C55E" };
const GAMES: { id: Game; icon: string; title: string; desc: string }[] = [
  { id: "coin", icon: "Coins", title: "Монетка", desc: "Орёл или решка, угадали — почти x2" },
  { id: "dice", icon: "Dices", title: "Кости", desc: "Сумма двух кубиков: меньше, больше или ровно 7" },
  { id: "wheel", icon: "Disc3", title: "Колесо удачи", desc: "Крутите колесо: множители от 0 до x5" },
  { id: "rocket", icon: "Rocket", title: "Ракета", desc: "Выберите множитель: долетит — выиграли, взорвалась — нет" },
  { id: "bullbear", icon: "TrendingUp", title: "Бык или медведь", desc: "Куда пойдёт биткоин: вверх или вниз за несколько минут" },
];
const usd = (v: number) => `$${v.toLocaleString("ru-RU", { maximumFractionDigits: v < 10 ? 4 : 2 })}`;
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const mx = (v: number) => `x${String(v).replace(".", ",")}`;
const when = (iso: string) => new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const GamesChannel = () => {
  const { user, token, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useGamesConfig(token);
  const [game, setGame] = useState<Game>("coin");
  const [bet, setBet] = useState("5");
  const [choice, setChoice] = useState<Record<Game, string>>({ coin: "heads", dice: "under", wheel: "", rocket: "", bullbear: "" });
  const [target, setTarget] = useState("2");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<GamesConfig["result"] | null>(null);
  const [spin, setSpin] = useState(false);
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

  if (isLoading || !data) return <Skeleton className="h-72 w-full max-w-5xl mx-auto bg-card" />;
  const st = data.settings;
  const me = data.me;
  const enabled = GAMES.filter((g) => st.games[g.id]);
  const cur = enabled.find((g) => g.id === game) ?? enabled[0];
  const amount = Number(bet) || 0;
  const closed = !st.enabled;
  const noLeft = me?.left === 0;

  const potential = () => {
    if (!cur) return 0;
    if (cur.id === "coin") return amount * data.mults.coin;
    if (cur.id === "dice") return amount * data.mults.dice[choice.dice as "under" | "seven" | "over"];
    if (cur.id === "rocket") return amount * (Number(target) || 0);
    if (cur.id === "bullbear") return amount * data.mults.bullbear.mult;
    return amount * Math.max(...data.mults.wheel);
  };

  const startBB = async (side: "bull" | "bear") => {
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

  const play = async () => {
    if (!user) return setAuthOpen(true);
    if (!cur) return;
    setBusy(true);
    setSpin(true);
    setRes(null);
    try {
      const body = { action: "games_play", game: cur.id, bet: amount, choice: choice[cur.id], target: Number(target) };
      const [next] = await Promise.all([fundRequest<GamesConfig>(token, "", body), new Promise((r) => setTimeout(r, 700))]);
      qc.setQueryData(["games-config", token], next);
      qc.invalidateQueries({ queryKey: ["tka-wallet"] });
      qc.invalidateQueries({ queryKey: ["tka-fund"] });
      setRes(next.result);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
      setSpin(false);
    }
  };

  const outcome = () => {
    if (!res || res.game !== cur?.id) return null;
    const d = res.detail;
    let line = "";
    if (res.game === "coin") line = `Выпал ${d.result === "heads" ? "орёл" : "решка"}`;
    if (res.game === "dice") line = `Кубики: ${FACES[Number(d.d1) - 1]} ${FACES[Number(d.d2) - 1]} · сумма ${d.sum}`;
    if (res.game === "wheel") line = `Колесо остановилось на ${mx(Number(d.mult))}`;
    if (res.game === "rocket") line = `Ракета взорвалась на ${mx(Number(d.crash))}, вы выбрали ${mx(Number(d.target))}`;
    return (
      <div className={`rounded-xl border px-3 py-3 text-center ${res.win ? "border-[#22C55E]/50 bg-[#22C55E]/10" : res.profit === 0 ? "border-border bg-rail/50" : "border-[#EA3943]/40 bg-[#EA3943]/10"}`}>
        <div className="text-sm text-white">{line}</div>
        <div className={`font-display text-xl mt-0.5 ${res.profit > 0 ? "text-[#22C55E]" : res.profit < 0 ? "text-[#EA3943]" : "text-white"}`}>
          {res.profit > 0 ? `Выигрыш +${fundFmt(res.profit)} TKA` : res.profit < 0 ? `Проигрыш −${fundFmt(Math.abs(res.profit))} TKA` : "Ставка вернулась"}
        </div>
      </div>
    );
  };

  const bbPanel = () => {
    const bb = data.bb;
    const a = bb?.active;
    const lastRound = bb?.last;
    const disabled = busy || closed || !!me?.locked || noLeft || amount < st.minBet || amount > Math.min(st.maxBet, data.mults.bullbear.maxBet);
    if (a) {
      const diff = bb?.price ? ((bb.price - a.entry) / a.entry) * 100 : null;
      const winning = diff === null ? null : a.side === "bull" ? diff > 0 : diff < 0;
      return (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2 text-center">
          <div className="text-xs text-muted-foreground">Ваша ставка {fundFmt(a.bet)} TKA на {a.side === "bull" ? "рост" : "падение"}</div>
          <div className="font-display text-3xl text-white">{a.overdue || left === 0 ? "Считаем итог…" : clock(left)}</div>
          <div className="flex justify-center gap-4 text-xs font-mono">
            <span className="text-muted-foreground">Старт {usd(a.entry)}</span>
            {bb?.price && <span className={winning ? "text-[#22C55E]" : "text-[#EA3943]"}>Сейчас {usd(bb.price)}{diff !== null ? ` (${diff > 0 ? "+" : ""}${diff.toFixed(3).replace(".", ",")}%)` : ""}</span>}
          </div>
          <div className="text-[11px] text-muted-foreground">Выигрыш {fundFmt(a.bet * a.mult)} TKA. Можно закрыть страницу: итог засчитается сам.</div>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {bb?.price && <div className="text-center text-xs text-muted-foreground">Bitcoin сейчас <span className="font-mono text-white">{usd(bb.price)}</span>. Итог через {data.mults.bullbear.minutes} мин: цена выше стартовой — выигрывает бык, ниже — медведь, ровно — ставка возвращается.</div>}
        <div className="grid grid-cols-2 gap-2">
          <button disabled={disabled} onClick={() => startBB("bull")} className="rounded-xl border border-[#22C55E]/50 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 disabled:opacity-50 transition-colors p-2 flex flex-col items-center gap-1">
            <img src="/icons/bull.png" alt="" className="w-16 h-16 rounded-lg" />
            <span className="text-sm font-bold text-[#22C55E]">Бык: вырастет</span>
            <span className="text-[11px] font-mono text-muted-foreground">{mx(data.mults.bullbear.mult)}</span>
          </button>
          <button disabled={disabled} onClick={() => startBB("bear")} className="rounded-xl border border-[#EA3943]/50 bg-[#EA3943]/10 hover:bg-[#EA3943]/20 disabled:opacity-50 transition-colors p-2 flex flex-col items-center gap-1">
            <img src="/icons/bear.png" alt="" className="w-16 h-16 rounded-lg" />
            <span className="text-sm font-bold text-[#EA3943]">Медведь: упадёт</span>
            <span className="text-[11px] font-mono text-muted-foreground">{mx(data.mults.bullbear.mult)}</span>
          </button>
        </div>
        {lastRound && (
          <div className={`rounded-lg border px-3 py-2 text-center text-sm ${lastRound.status === "win" ? "border-[#22C55E]/50 bg-[#22C55E]/10" : lastRound.status === "void" ? "border-border bg-rail/50" : "border-[#EA3943]/40 bg-[#EA3943]/10"}`}>
            <div className="text-white">
              Прошлый раунд: {lastRound.entry ? usd(lastRound.entry) : ""} → {lastRound.exit ? usd(lastRound.exit) : "без цены"}
            </div>
            <div className={`font-display ${lastRound.status === "win" ? "text-[#22C55E]" : lastRound.status === "void" ? "text-white" : "text-[#EA3943]"}`}>
              {lastRound.status === "win" ? `Угадали: +${fundFmt(lastRound.payout - lastRound.bet)} TKA` : lastRound.status === "void" ? "Цена не изменилась, ставка вернулась" : `Не угадали: −${fundFmt(lastRound.bet)} TKA`}
            </div>
          </div>
        )}
      </div>
    );
  };

  const Pick = ({ id, label, sub }: { id: string; label: string; sub?: string }) => (
    <button
      type="button"
      onClick={() => setChoice({ ...choice, [cur!.id]: id })}
      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${choice[cur!.id] === id ? "border-primary bg-primary/15 text-white" : "border-border text-muted-foreground hover:text-white"}`}
    >
      <div className="font-semibold">{label}</div>
      {sub && <div className="text-[11px] font-mono">{sub}</div>}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 flex-wrap">
        <Icon name="Gamepad2" size={22} className="text-primary" />
        <div className="min-w-0">
          <h2 className="font-display text-lg text-white leading-tight">Мини-игры</h2>
          <p className="text-xs text-muted-foreground">Развлечение за TKA. Выигрыши платит общий фонд, проигрыши возвращаются в него. Это игра на игровую монету, а не деньги.</p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-lg bg-rail px-3 py-2">
          <TkaIcon size={20} />
          <span className="font-mono text-white">{me ? fundFmt(me.balance) : "—"}</span>
          <span className="text-[10px] font-semibold text-primary">TKA</span>
        </div>
      </section>

      {closed && <div className="rounded-lg border border-[#EA3943]/40 bg-[#EA3943]/10 px-3 py-2 text-sm text-foreground">{st.message || "Мини-игры временно закрыты."}</div>}
      {me?.locked && <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">Игры доступны со статуса «{data.titles[st.minLevel - 1]}». Ваш статус пока ниже.</div>}

      <div className="flex flex-wrap gap-2">
        {enabled.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setGame(g.id);
              setRes(null);
            }}
            className="rounded-xl border border-l-4 px-3 py-2 text-left flex items-center gap-2 transition-all hover:brightness-110"
            style={{
              borderColor: cur?.id === g.id ? `${GAME_COLOR[g.id]}99` : "hsl(var(--border))",
              borderLeftColor: GAME_COLOR[g.id],
              background: cur?.id === g.id ? `${GAME_COLOR[g.id]}22` : "hsl(var(--card))",
              boxShadow: cur?.id === g.id ? `0 0 14px ${GAME_COLOR[g.id]}40` : undefined,
            }}
          >
            <Icon name={g.icon} size={18} style={{ color: GAME_COLOR[g.id] }} />
            <span>
              <span className="text-sm text-white font-semibold block leading-tight">{g.title}</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block max-w-[190px] leading-tight">{g.desc}</span>
            </span>
          </button>
        ))}
      </div>

      {!cur ? (
        <p className="text-sm text-muted-foreground">Сейчас все игры выключены.</p>
      ) : (
        <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className={`${cur?.id === "bullbear" ? "h-28" : "h-24"} rounded-xl bg-rail/60 flex items-center justify-center overflow-hidden`}>
              {cur.id === "bullbear" ? (
                <div className="flex items-center gap-4">
                  <img src="/icons/bull.png" alt="Бык" className="w-20 h-20 rounded-xl" />
                  <span className="font-display text-xl text-muted-foreground">VS</span>
                  <img src="/icons/bear.png" alt="Медведь" className="w-20 h-20 rounded-xl" />
                </div>
              ) : (
                <Icon name={cur.icon} size={56} className={`text-primary ${spin ? "animate-spin" : ""}`} />
              )}
            </div>

            {cur.id === "coin" && (
              <div className="flex gap-2">
                <Pick id="heads" label="Орёл" sub={mx(data.mults.coin)} />
                <Pick id="tails" label="Решка" sub={mx(data.mults.coin)} />
              </div>
            )}
            {cur.id === "dice" && (
              <div className="flex gap-2">
                <Pick id="under" label="Меньше 7" sub={mx(data.mults.dice.under)} />
                <Pick id="seven" label="Ровно 7" sub={mx(data.mults.dice.seven)} />
                <Pick id="over" label="Больше 7" sub={mx(data.mults.dice.over)} />
              </div>
            )}
            {cur.id === "wheel" && (
              <div className="flex flex-wrap gap-1">
                {[...new Set(data.mults.wheel)].sort((a, b) => a - b).map((m) => (
                  <span key={m} className={`rounded px-2 py-1 text-xs font-mono ${m === 0 ? "bg-[#EA3943]/15 text-[#EA3943]" : m < 1 ? "bg-rail text-muted-foreground" : "bg-[#22C55E]/15 text-[#22C55E]"}`}>
                    {mx(m)}
                  </span>
                ))}
              </div>
            )}
            {cur.id === "rocket" && (
              <label className="space-y-1 block">
                <span className="text-xs text-muted-foreground">Ваш множитель (от 1,1 до {mx(st.rocketMaxMult)})</span>
                <div className="flex gap-1.5">
                  <Input type="number" step="0.1" min={1.1} max={st.rocketMaxMult} value={target} onChange={(e) => setTarget(e.target.value)} className="flex-1" />
                  {[1.5, 2, 5, 10].map((m) => (
                    <Button key={m} type="button" variant="outline" size="sm" className="bg-transparent px-2" onClick={() => setTarget(String(m))}>{mx(m)}</Button>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">Чем больше множитель, тем выше выигрыш и тем реже ракета долетает.</span>
              </label>
            )}

            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Ставка, TKA (от {fundFmt(st.minBet)} до {fundFmt(st.maxBet)})</span>
              <div className="flex gap-1.5">
                <Input type="number" min={st.minBet} max={st.maxBet} value={bet} onChange={(e) => setBet(e.target.value)} className="flex-1" />
                {[5, 10, 25, 50].filter((v) => v <= st.maxBet).map((v) => (
                  <Button key={v} type="button" variant="outline" size="sm" className="bg-transparent px-2" onClick={() => setBet(String(v))}>{v}</Button>
                ))}
              </div>
            </label>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Возможный выигрыш{cur.id === "wheel" ? " (максимум)" : ""}</span>
              <span className="font-mono text-white">{fundFmt(potential())} TKA</span>
            </div>

            {cur.id === "bullbear" ? bbPanel() : (
              <Button className="w-full h-11 font-bold text-base" disabled={busy || closed || !!me?.locked || noLeft || amount < st.minBet || amount > st.maxBet} onClick={play}>
                {!user ? "Войти и играть" : noLeft ? "Лимит игр на сегодня" : busy ? "Играем…" : cur.id === "wheel" ? "Крутить" : cur.id === "rocket" ? "Запустить" : "Играть"}
              </Button>
            )}
            {cur.id !== "bullbear" && outcome()}
            <p className="text-[10px] text-muted-foreground leading-snug">
              Результат определяется на сервере случайным образом и не зависит от того, что было раньше. Игры затягивают: играйте только ради развлечения и тратьте столько TKA, сколько не жалко.
            </p>
          </section>

          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-rail/50 px-2.5 py-2">
                  <div className="text-muted-foreground">Банк игр (фонд)</div>
                  <div className="font-mono text-white">{fundFmt(data.bank)}</div>
                </div>
                <div className="rounded-lg bg-rail/50 px-2.5 py-2">
                  <div className="text-muted-foreground">Игр осталось</div>
                  <div className="font-mono text-white">{me ? (me.left === null ? "без лимита" : me.left) : "—"}</div>
                </div>
              </div>
              {me && (
                <div className="rounded-lg bg-rail/50 px-2.5 py-2 text-xs flex justify-between">
                  <span className="text-muted-foreground">Ваш итог за сутки</span>
                  <span className={`font-mono ${me.net >= 0 ? "text-[#22C55E]" : "text-[#EA3943]"}`}>{me.net > 0 ? "+" : me.net < 0 ? "−" : ""}{fundFmt(Math.abs(me.net))}</span>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-3">
              <h3 className="text-white font-semibold text-sm mb-1.5">Последние игры</h3>
              {data.recent.length === 0 ? (
                <p className="text-xs text-muted-foreground">Пока никто не играл.</p>
              ) : (
                <div className="divide-y divide-border">
                  {data.recent.map((r) => {
                    const p = r.payout - r.bet;
                    return (
                      <div key={r.id} className="flex items-center gap-2 py-1.5 text-xs">
                        <span className="text-white truncate flex-1">{r.name}</span>
                        <span className="text-muted-foreground">{data.names[r.game]}</span>
                        <span className={`font-mono ${p > 0 ? "text-[#22C55E]" : p < 0 ? "text-[#EA3943]" : "text-muted-foreground"}`}>{p > 0 ? "+" : p < 0 ? "−" : ""}{fundFmt(Math.abs(p))}</span>
                        <span className="text-[10px] text-muted-foreground">{when(r.at)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamesChannel;
