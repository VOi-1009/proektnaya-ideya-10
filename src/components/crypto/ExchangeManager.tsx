import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { COIN_META } from "@/lib/crypto";
import { LEVELS } from "@/lib/status";
import { ExchangeSettings, fundFmt, fundRequest } from "@/lib/fund";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const COINS = ["bitcoin", "ethereum", "binancecoin", "ripple", "solana", "dogecoin", "hyperliquid", "zcash", "tron", "cardano", "chainlink", "stellar", "avalanche-2", "sui", "shiba-inu", "the-open-network", "hedera-hashgraph", "litecoin"];

interface AdminData {
  settings: ExchangeSettings;
  stats: { open: number; closed: number; traders: number; orders: number; fees: number; feeOps: number };
}

const ExchangeManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["exchange-admin", token],
    queryFn: () => fundRequest<AdminData>(token, "?action=exchange_admin"),
    enabled: !!token,
  });
  const [form, setForm] = useState<ExchangeSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !form) setForm(data.settings);
  }, [data, form]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await fundRequest<ExchangeSettings>(token, "", { action: "exchange_save", ...form });
      setForm(saved);
      qc.invalidateQueries({ queryKey: ["exchange-settings"] });
      await refetch();
      toast({ title: "Настройки биржи сохранены" });
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!data || !form) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const st = data.stats;
  const toggleCoin = (id: string) =>
    setForm({ ...form, disabledCoins: form.disabledCoins.includes(id) ? form.disabledCoins.filter((c) => c !== id) : [...form.disabledCoins, id] });
  const tiers = form.leverageTiers ?? [];
  const lev = (level: number) => {
    let best = 1;
    for (const [lv, l] of tiers) if (level >= lv) best = l;
    return best;
  };
  const setLev = (level: number, value: number) => {
    const map = new Map<number, number>(tiers.map(([a, b]) => [a, b]));
    map.set(level, Math.max(1, Math.min(100, Math.round(value) || 1)));
    map.set(1, map.get(1) ?? 1);
    setForm({ ...form, leverageTiers: [...map.entries()].sort((a, b) => a[0] - b[0]) as [number, number][] });
  };
  const setCoinLevel = (id: string, level: number) => {
    const next = { ...(form.coinMinLevel ?? {}) };
    if (level >= 2) next[id] = level;
    else delete next[id];
    setForm({ ...form, coinMinLevel: next });
  };
  const example = (form.feeBase === "volume" ? 100 * 10 : 100) * form.feePercent / 100;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Биржа</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Настройки тренировочной биржи. Комиссия со сделок идёт в фонд. Все суммы здесь в виртуальных USDT.
        </p>
      </div>

      <div className="grid sm:grid-cols-5 gap-2">
        {[
          ["Открытых позиций", String(st.open)],
          ["Закрытых сделок", String(st.closed)],
          ["Ордеров в ожидании", String(st.orders)],
          ["Трейдеров", String(st.traders)],
          ["Комиссий в фонд", `${fundFmt(st.fees)} TKA`],
        ].map(([l, v]) => (
          <div key={l} className="bg-card border border-border rounded-lg px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{l}</div>
            <div className="font-mono text-white text-sm">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Percent" size={15} className="text-primary" /> Комиссия за сделки</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Комиссия, % (0 – 1)</span>
              <input className={inputCls} type="number" step="0.01" min={0} max={1} value={form.feePercent} onChange={(e) => setForm({ ...form, feePercent: Number(e.target.value) })} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">С чего считать</span>
              <select className={inputCls} value={form.feeBase} onChange={(e) => setForm({ ...form, feeBase: e.target.value as "volume" | "margin" })}>
                <option value="volume">С объёма (ставка × плечо)</option>
                <option value="margin">Со ставки</option>
              </select>
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Пример: ставка 100 USDT{form.feeBase === "volume" ? " с плечом x10" : ""} — комиссия {example.toFixed(4).replace(".", ",")} USDT. Берётся при открытии сделки, для лимитного ордера возвращается, если его отменить.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="SlidersHorizontal" size={15} className="text-primary" /> Ограничения</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Максимальное плечо (1 – 100)</span>
              <input className={inputCls} type="number" min={1} max={100} value={form.maxLeverage} onChange={(e) => setForm({ ...form, maxLeverage: Number(e.target.value) })} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Минимальная ставка, USDT</span>
              <input className={inputCls} type="number" min={0.01} step="0.01" value={form.minMargin} onChange={(e) => setForm({ ...form, minMargin: Number(e.target.value) })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            Новые сделки разрешены
          </label>
          {!form.enabled && (
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Сообщение участникам (необязательно)</span>
              <input className={inputCls} maxLength={200} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Например: техническое обслуживание до 18:00" />
            </label>
          )}
          <p className="text-[11px] text-muted-foreground">Когда сделки приостановлены, закрывать уже открытые позиции и отменять ордера можно.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Coins" size={15} className="text-primary" /> Монеты для торговли</h2>
        <p className="text-[11px] text-muted-foreground">Отключённая монета недоступна для новых сделок, но открытые позиции по ней остаются.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {COINS.map((id) => {
            const off = form.disabledCoins.includes(id);
            return (
              <label key={id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm cursor-pointer ${off ? "border-border text-muted-foreground" : "border-primary/30 bg-primary/5 text-white"}`}>
                <Switch checked={!off} onCheckedChange={() => toggleCoin(id)} />
                <span className="truncate">{COIN_META[id]?.ru ?? id}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="ShieldCheck" size={15} className="text-primary" /> Доступ по статусам</h2>
            <p className="text-[11px] text-muted-foreground max-w-xl">
              Чем выше статус участника, тем большее плечо и больше монет ему доступно. Новичкам рисковать сложнее. Администраторы ограничений не имеют.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <Switch checked={form.levelRules !== false} onCheckedChange={(v) => setForm({ ...form, levelRules: v })} />
            Ограничения включены
          </label>
        </div>

        {form.levelRules !== false && (
          <>
            <div>
              <div className="text-xs font-semibold text-primary mb-1">Максимальное плечо по статусам</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {LEVELS.slice(0, 10).map((lv, i) => {
                  const level = i + 1;
                  const current = lev(level);
                  return (
                    <label key={lv.title} className="rounded-lg bg-rail/50 px-2 py-1.5 space-y-1 block">
                      <span className="text-[11px] flex items-center gap-1" style={{ color: lv.color }}>{lv.title}</span>
                      <input
                        className={`${inputCls} h-8`}
                        type="number"
                        min={1}
                        max={100}
                        value={current}
                        onChange={(e) => setLev(level, Number(e.target.value))}
                        title="Максимальное плечо для этого статуса"
                      />
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Плечо не может быть ниже, чем у статуса ниже. Общий предел плеча выше всё равно действует.</p>
            </div>

            <div>
              <div className="text-xs font-semibold text-primary mb-1">С какого статуса доступна монета</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {COINS.map((id) => (
                  <label key={id} className="rounded-lg bg-rail/50 px-2 py-1.5 flex items-center gap-2">
                    <span className="text-xs text-white truncate flex-1">{COIN_META[id]?.ru ?? id}</span>
                    <select
                      className="bg-rail text-xs text-white rounded px-1 h-7 border border-border outline-none"
                      value={form.coinMinLevel?.[id] ?? 0}
                      onChange={(e) => setCoinLevel(id, Number(e.target.value))}
                    >
                      <option value={0}>всем</option>
                      {LEVELS.slice(1, 10).map((lv, i) => (
                        <option key={lv.title} value={i + 2}>с «{lv.title}»</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Button onClick={save} disabled={saving} className="font-semibold">
        {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
        Сохранить
      </Button>
    </div>
  );
};

export default ExchangeManager;
