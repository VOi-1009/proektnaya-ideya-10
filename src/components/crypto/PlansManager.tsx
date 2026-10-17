import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { TIERS, plansRequest } from "@/lib/plans";
import UserAvatar from "./UserAvatar";
import TierBadge from "./TierBadge";

interface Req {
  id: number;
  tier: number;
  amount: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  user: { id: number; name: string; avatar: string; email: string };
}
interface Sub {
  userId: number;
  tier: number;
  expiresAt: string;
  mailOn: boolean;
  name: string;
  email: string;
  avatar: string;
  active: boolean;
}
interface Admin {
  plans: { prices: Record<string, number>; days: number };
  requests: Req[];
  subscribers: Sub[];
  stats: { revenue: number; payments: number; active: number; pending: number };
}

const inputCls = "bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";
const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

const PlansManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["plans-admin", token], queryFn: () => plansRequest<Admin>(token, undefined, "&admin=1") });
  const [prices, setPrices] = useState<Record<string, string> | null>(null);
  const [days, setDays] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [grant, setGrant] = useState({ userId: "", tier: 1, days: "30" });

  const run = async (body: object, ok: string) => {
    try {
      await plansRequest(token, body);
      toast({ title: ok });
      qc.invalidateQueries({ queryKey: ["plans-admin"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      return true;
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
      return false;
    }
  };

  if (!data) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const p = prices ?? Object.fromEntries(Object.entries(data.plans.prices).map(([k, v]) => [k, String(v)]));
  const d = days ?? String(data.plans.days);
  const pending = data.requests.filter((r) => r.status === "pending");
  const history = data.requests.filter((r) => r.status !== "pending").slice(0, 15);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["Wallet", "Подтверждено", `${data.stats.revenue.toLocaleString("ru-RU")} ₽`],
          ["Users", "Активных подписчиков", data.stats.active],
          ["Receipt", "Оплат", data.stats.payments],
          ["Inbox", "Ждут проверки", data.stats.pending],
        ].map(([icon, label, v]) => (
          <div key={String(label)} className="bg-card border border-border rounded-lg p-3">
            <div className="text-muted-foreground text-xs flex items-center gap-1.5">
              <Icon name={String(icon)} size={13} /> {label}
            </div>
            <div className="text-white font-mono text-xl mt-1">{v}</div>
          </div>
        ))}
      </div>

      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Icon name="Inbox" size={18} className="text-yellow-300" /> Заявки на подписку
          {pending.length > 0 && <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">{pending.length}</span>}
        </h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-3">Новых заявок нет. Сверьте поступления на счёт, когда они появятся.</p>
        ) : (
          pending.map((r) => (
            <div key={r.id} className="bg-rail/60 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <UserAvatar name={r.user.name} avatar={r.user.avatar} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium truncate">{r.user.name}</span>
                    <TierBadge tier={r.tier} compact />
                    <span className="font-mono text-emerald-200 font-semibold">{r.amount} ₽</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground break-words">{r.comment}</p>}
                  <div className="text-[10px] text-muted-foreground/70 font-mono">{fmt(r.createdAt)}{r.user.email && ` · ${r.user.email}`}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={busy === r.id}
                  onClick={async () => {
                    setBusy(r.id);
                    await run({ action: "approve", id: r.id }, `Подписка «${TIERS.find((t) => t.id === r.tier)?.name}» включена`);
                    setBusy(null);
                  }}
                  className="font-semibold bg-emerald-500 hover:bg-emerald-400 text-white"
                >
                  <Icon name="Check" size={16} className="mr-1.5" /> Подтвердить
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => window.confirm("Отклонить заявку?") && run({ action: "reject", id: r.id }, "Заявка отклонена")}
                  className="text-muted-foreground hover:text-down hover:bg-hover px-2"
                >
                  <Icon name="X" size={16} />
                </Button>
              </div>
            </div>
          ))
        )}
        {history.length > 0 && (
          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer hover:text-white">История заявок ({history.length})</summary>
            <div className="mt-2 space-y-1">
              {history.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-white">{r.user.name}</span>
                  <TierBadge tier={r.tier} compact />
                  <span>{r.amount} ₽</span>
                  <span className={r.status === "approved" ? "text-emerald-300" : "text-rose-300"}>{r.status === "approved" ? "подтверждена" : "отклонена"}</span>
                  <span className="ml-auto font-mono">{fmt(r.createdAt)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Icon name="Tag" size={18} className="text-yellow-300" /> Цены и срок
          </h2>
          {TIERS.map((t) => (
            <label key={t.id} className="flex items-center gap-3">
              <TierBadge tier={t.id} className="w-24 justify-center" />
              <input
                className={`${inputCls} w-28 text-right font-mono`}
                value={p[String(t.id)]}
                inputMode="numeric"
                onChange={(e) => setPrices({ ...p, [String(t.id)]: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              />
              <span className="text-muted-foreground text-sm">₽</span>
            </label>
          ))}
          <label className="flex items-center gap-3 text-sm text-white">
            Срок подписки
            <input className={`${inputCls} w-20 text-center`} value={d} inputMode="numeric" onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 3))} />
            дней
          </label>
          <Button
            onClick={() => run({ action: "settings", prices: p, days: Number(d) || 30 }, "Цены сохранены")}
            className="font-semibold"
          >
            Сохранить
          </Button>
        </section>

        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Icon name="Gift" size={18} className="text-yellow-300" /> Выдать подписку вручную
          </h2>
          <div className="flex flex-wrap gap-2">
            <input className={`${inputCls} w-32`} placeholder="ID участника" inputMode="numeric" value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value.replace(/\D/g, "") })} />
            <select className={inputCls} value={grant.tier} onChange={(e) => setGrant({ ...grant, tier: Number(e.target.value) })}>
              {TIERS.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input className={`${inputCls} w-20 text-center`} value={grant.days} inputMode="numeric" onChange={(e) => setGrant({ ...grant, days: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            <span className="text-muted-foreground text-sm self-center">дней</span>
          </div>
          <Button
            disabled={!grant.userId}
            onClick={async () => (await run({ action: "grant", userId: Number(grant.userId), tier: grant.tier, days: Number(grant.days) || 30 }, "Подписка выдана")) && setGrant({ ...grant, userId: "" })}
            variant="outline"
            className="bg-transparent border-input hover:bg-hover hover:text-white"
          >
            Выдать
          </Button>
          <p className="text-xs text-muted-foreground">ID участника виден во вкладке «Пользователи» и в журнале. Повторная выдача продлевает срок.</p>
        </section>
      </div>

      <section className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Icon name="Users" size={18} className="text-yellow-300" /> Подписчики
        </h2>
        {data.subscribers.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-3">Подписчиков пока нет.</p>
        ) : (
          data.subscribers.map((s) => (
            <div key={s.userId} className={`flex items-center gap-3 bg-rail/60 rounded-lg px-3 py-2 ${s.active ? "" : "opacity-50"}`}>
              <UserAvatar name={s.name} avatar={s.avatar} className="w-8 h-8 text-xs" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium truncate">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">#{s.userId}</span>
                  <TierBadge tier={s.tier} compact />
                  {s.tier >= 3 && <Icon name={s.mailOn ? "Mail" : "MailX"} size={12} className="text-muted-foreground" />}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {s.active ? `до ${fmtDay(s.expiresAt)}` : `истекла ${fmtDay(s.expiresAt)}`}{s.email && ` · ${s.email}`}
                </div>
              </div>
              {s.active && (
                <button
                  onClick={() => window.confirm(`Отключить подписку у ${s.name}?`) && run({ action: "revoke", userId: s.userId }, "Подписка отключена")}
                  className="text-muted-foreground hover:text-down"
                  title="Отключить"
                >
                  <Icon name="Ban" size={15} />
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default PlansManager;
