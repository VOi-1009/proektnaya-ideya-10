import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { fmtDateTime, fundFmt, fundRequest } from "@/lib/fund";
import { ReferralInfo } from "@/lib/referral";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

type Settings = ReferralInfo & { maxPerUser: number };
interface Data {
  settings: Settings;
  triggers: Record<string, string>;
  stats: { total: number; paid: number; pending: number; tka: number; usdt: number; fund: number };
  top: { name: string; invited: number; paid: number }[];
  recent: { id: number; status: string; source: string; at: string; reward: number; inviter: string; friend: string }[];
}

const Num = ({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) => (
  <label className="space-y-1 block">
    <span className="text-xs text-muted-foreground">{label}</span>
    <input className={inputCls} type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    {hint && <span className="text-[10px] text-muted-foreground/80 block leading-snug">{hint}</span>}
  </label>
);

const ReferralManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["referral-admin", token], enabled: !!token, queryFn: () => fundRequest<Data>(token, "?action=referral_admin"), refetchInterval: 60_000 });
  const [f, setF] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !f) setF(data.settings);
  }, [data, f]);

  if (!data || !f) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF({ ...f, [k]: v });

  const save = async () => {
    setBusy(true);
    try {
      const next = await fundRequest<Data>(token, "", { action: "referral_save", ...f });
      qc.setQueryData(["referral-admin", token], next);
      qc.invalidateQueries({ queryKey: ["referral-info"] });
      toast({ title: "Настройки сохранены" });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const s = data.stats;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white flex items-center gap-2"><Icon name="UserPlus" size={22} className="text-primary" /> Приведи друга</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Участники зовут друзей по ссылке или промокоду. За каждого друга участник получает награду, а столько же TKA уходит в общий фонд.</p>
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-white">
          <Switch checked={f.enabled} onCheckedChange={(v) => set("enabled", v)} />
          {f.enabled ? "Включено" : "Выключено"}
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {[
          ["Приглашено", s.total],
          ["С наградой", s.paid],
          ["Ждут активности", s.pending],
          ["Выдано TKA", fundFmt(s.tka)],
          ["Выдано USDT", fundFmt(s.usdt)],
          ["Ушло в фонд", fundFmt(s.fund)],
        ].map(([l, v]) => (
          <div key={String(l)} className="bg-card border border-border rounded-lg px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{l}</div>
            <div className="text-white font-mono">{v}</div>
          </div>
        ))}
      </div>

      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">Награда за каждого друга</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <Num label="Участнику, TKA" value={f.rewardTka} onChange={(v) => set("rewardTka", v)} />
          <Num label="Участнику, виртуальные USDT" value={f.rewardUsdt} onChange={(v) => set("rewardUsdt", v)} />
          <Num label="В общий фонд, TKA" hint="Начисляется в фонд сверх награды" value={f.fundTka} onChange={(v) => set("fundTka", v)} />
          <Num label="Бонус другу, TKA" hint="Другу за приход по приглашению. 0 — без бонуса" value={f.friendBonusTka} onChange={(v) => set("friendBonusTka", v)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Когда выдавать награду</span>
            <select className={inputCls} value={f.trigger} onChange={(e) => set("trigger", e.target.value as Settings["trigger"])}>
              {Object.entries(data.triggers).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground/80 block leading-snug">«После первой сделки или игры» защищает от фейковых аккаунтов.</span>
          </label>
          <Num label="Лимит друзей на участника" hint="0 — без ограничения" value={f.maxPerUser} onChange={(v) => set("maxPerUser", v)} />
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">Тексты для участников</h2>
        <input className={inputCls} maxLength={60} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Заголовок" />
        <textarea className={`${inputCls} h-24 py-2 resize-none`} maxLength={500} value={f.text} onChange={(e) => set("text", e.target.value)} placeholder="Описание условий" />
      </section>

      <Button onClick={save} disabled={busy} className="font-semibold">
        {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />} Сохранить
      </Button>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-white font-semibold text-sm mb-2">Лучшие приглашающие</h2>
          {data.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Приглашений пока нет.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.top.map((t, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="w-5 text-muted-foreground text-xs">{i + 1}</span>
                  <span className="text-white truncate flex-1">{t.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{t.paid} из {t.invited}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-white font-semibold text-sm mb-2">Последние приглашения</h2>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока пусто.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.recent.map((r) => (
                <div key={r.id} className="flex items-center gap-2 py-1.5 text-xs">
                  <Icon name={r.status === "paid" ? "CircleCheck" : "Clock"} size={13} className={r.status === "paid" ? "text-[#16C784]" : "text-muted-foreground"} />
                  <span className="text-white truncate flex-1">{r.inviter} → {r.friend}</span>
                  <span className="text-muted-foreground font-mono flex-shrink-0">{fmtDateTime(r.at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReferralManager;
