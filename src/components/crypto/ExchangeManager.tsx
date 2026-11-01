import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { COIN_META } from "@/lib/crypto";
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
      qc.setQueryData(["exchange-settings"], saved);
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

      <Button onClick={save} disabled={saving} className="font-semibold">
        {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
        Сохранить
      </Button>
    </div>
  );
};

export default ExchangeManager;
