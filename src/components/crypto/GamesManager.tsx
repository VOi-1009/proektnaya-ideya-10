import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { fundFmt, fundRequest, GameRow, GamesSettings } from "@/lib/fund";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

interface AdminData {
  settings: GamesSettings;
  names: Record<string, string>;
  bank: number;
  titles: string[];
  wheel: number[];
  bbActive?: { count: number; sum: number };
  stats: { count: number; players: number; bets: number; payouts: number; result: number; day: number };
  per: { game: string; count: number; bets: number; payouts: number }[];
  recent: GameRow[];
}

const Num = ({ label, hint, value, onChange, min, max, step }: { label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) => (
  <label className="space-y-1 block">
    <span className="text-xs text-muted-foreground">{label}</span>
    <input className={inputCls} type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    {hint && <span className="text-[10px] text-muted-foreground/80 block leading-snug">{hint}</span>}
  </label>
);

const when = (iso: string) => new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const GamesManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["games-admin", token],
    queryFn: () => fundRequest<AdminData>(token, "?action=games_admin"),
    enabled: !!token,
    refetchInterval: 60_000,
  });
  const [f, setF] = useState<GamesSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !f) setF(data.settings);
  }, [data, f]);

  const save = async () => {
    if (!f) return;
    setBusy(true);
    try {
      const next = await fundRequest<AdminData>(token, "", { action: "games_save", ...f });
      qc.setQueryData(["games-admin", token], next);
      qc.invalidateQueries({ queryKey: ["games-config"] });
      setF(next.settings);
      toast({ title: "Настройки игр сохранены" });
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!data || !f) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const set = <K extends keyof GamesSettings>(key: K, v: GamesSettings[K]) => setF({ ...f, [key]: v });
  const st = data.stats;
  const edge = f.houseEdge / 100;
  const wheelRtp = (data.wheel.reduce((a, b) => a + b, 0) / data.wheel.length) * 100;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Мини-игры</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Банк игр это общий фонд: выигрыши платятся из него, проигрыши возвращаются в него, новые TKA не появляются. Если в фонде мало средств, крупные ставки блокируются.
        </p>
      </div>

      <div className="grid sm:grid-cols-5 gap-2">
        {[
          ["Банк (фонд)", `${fundFmt(data.bank)} TKA`],
          ["Игр сыграно", `${st.count} · за сутки ${st.day}`],
          ["Игроков", String(st.players)],
          ["Поставлено", `${fundFmt(st.bets)}`],
          ["Итог для фонда", `${st.result > 0 ? "+" : st.result < 0 ? "−" : ""}${fundFmt(Math.abs(st.result))}`],
        ].map(([l, v]) => (
          <div key={l} className="bg-card border border-border rounded-lg px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{l}</div>
            <div className="font-mono text-white text-sm">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Gamepad2" size={15} className="text-primary" /> Общие настройки</h2>
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <Switch checked={f.enabled} onCheckedChange={(v) => set("enabled", v)} />
              Игры открыты
            </label>
          </div>
          {!f.enabled && (
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Сообщение участникам</span>
              <input className={inputCls} maxLength={200} value={f.message} onChange={(e) => set("message", e.target.value)} placeholder="Например: игры вернутся после обновления" />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Num label="Минимальная ставка, TKA" value={f.minBet} min={0.01} step={0.5} onChange={(v) => set("minBet", v)} />
            <Num label="Максимальная ставка, TKA" value={f.maxBet} min={1} onChange={(v) => set("maxBet", v)} />
            <Num label="Игр в сутки на человека" hint="0 — без лимита" value={f.dailyLimit} min={0} onChange={(v) => set("dailyLimit", v)} />
            <Num label="Пауза между играми, сек" value={f.cooldownSec} min={0} max={60} onChange={(v) => set("cooldownSec", v)} />
            <Num label="Дневной лимит выигрыша, TKA" hint="Когда суммарный выигрыш за сутки достигнут, игры закрываются до завтра. 0 — без лимита" value={f.dailyWinCap} min={0} onChange={(v) => set("dailyWinCap", v)} />
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">С какого статуса можно играть</span>
              <select className={inputCls} value={f.minLevel} onChange={(e) => set("minLevel", Number(e.target.value))}>
                {data.titles.slice(0, 10).map((t, i) => (
                  <option key={t} value={i + 1}>{i === 0 ? "со всех" : `с «${t}»`}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Percent" size={15} className="text-primary" /> Шансы и игры</h2>
            <div className="grid grid-cols-2 gap-3">
              <Num label="Преимущество фонда, %" hint="Чем больше, тем меньше шансов у игрока. 0 — игра абсолютно честная, 3 — как у большинства игр" value={f.houseEdge} min={0} max={20} step={0.5} onChange={(v) => set("houseEdge", v)} />
              <Num label="Максимум ракеты, x" value={f.rocketMaxMult} min={1.5} max={1000} onChange={(v) => set("rocketMaxMult", v)} />
            </div>
            <div className="space-y-1.5">
              {Object.entries(data.names).map(([id, name]) => (
                <label key={id} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                  <Switch checked={!!f.games[id]} onCheckedChange={(v) => set("games", { ...f.games, [id]: v })} />
                  {name}
                </label>
              ))}
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-white font-semibold">
                <img src="/icons/bull.png" alt="" className="w-6 h-6 rounded" />
                <img src="/icons/bear.png" alt="" className="w-6 h-6 rounded" />
                Бык или медведь
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Num label="Длительность, мин" value={f.bbMinutes} min={1} max={60} onChange={(v) => set("bbMinutes", v)} />
                <Num label="Множитель выигрыша" hint="x1,9 значит ставка 10 даёт 19" value={f.bbMult} min={1.1} max={3} step={0.05} onChange={(v) => set("bbMult", v)} />
                <Num label="Макс. ставка, TKA" value={f.bbMaxBet} min={1} onChange={(v) => set("bbMaxBet", v)} />
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Раунд идёт на сервере и закрывается сам, даже если игрок закрыл сайт. При равной цене ставка возвращается. Сейчас идёт раундов: {data.bbActive?.count ?? 0} на {fundFmt(data.bbActive?.sum ?? 0)} TKA. При множителе x{String(f.bbMult).replace(".", ",")} фонд в среднем получает {(100 - (f.bbMult / 2) * 100).toFixed(1).replace(".", ",")}% с каждой ставки.
              </p>
            </div>
            <div className="rounded-lg bg-rail/50 px-3 py-2 text-[11px] text-muted-foreground leading-snug space-y-0.5">
              <div>Возврат игроку при текущих настройках (в среднем):</div>
              <div className="font-mono text-white">Монетка, кости, ракета ≈ {(100 - f.houseEdge).toFixed(1).replace(".", ",")}% · Колесо {wheelRtp.toFixed(1).replace(".", ",")}% (фиксированное)</div>
              <div>Множитель монетки x{(2 * (1 - edge)).toFixed(2).replace(".", ",")}.</div>
            </div>
          </div>
          <Button disabled={busy} className="font-semibold" onClick={save}>
            {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-white font-semibold text-sm mb-2">По играм</h2>
          {data.per.length === 0 ? (
            <p className="text-sm text-muted-foreground">Игр пока не было.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.per.map((g) => (
                <div key={g.game} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="text-white flex-1">{data.names[g.game] ?? g.game}</span>
                  <span className="text-xs text-muted-foreground">{g.count} игр</span>
                  <span className="font-mono text-xs text-muted-foreground">{fundFmt(g.bets)} → {fundFmt(g.payouts)}</span>
                  <span className={`font-mono text-xs ${g.bets - g.payouts >= 0 ? "text-[#22C55E]" : "text-[#EA3943]"}`}>{g.bets - g.payouts > 0 ? "+" : g.bets - g.payouts < 0 ? "−" : ""}{fundFmt(Math.abs(g.bets - g.payouts))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-white font-semibold text-sm mb-2">Последние игры</h2>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Игр пока не было.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.recent.map((r) => {
                const p = r.payout - r.bet;
                return (
                  <div key={r.id} className="flex items-center gap-2 py-1.5 text-xs">
                    <span className="text-white truncate flex-1">{r.name}</span>
                    <span className="text-muted-foreground">{data.names[r.game]}</span>
                    <span className="font-mono text-muted-foreground">{fundFmt(r.bet)}</span>
                    <span className={`font-mono ${p > 0 ? "text-[#22C55E]" : p < 0 ? "text-[#EA3943]" : "text-muted-foreground"}`}>{p > 0 ? "+" : p < 0 ? "−" : ""}{fundFmt(Math.abs(p))}</span>
                    <span className="text-[10px] text-muted-foreground">{when(r.at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamesManager;
