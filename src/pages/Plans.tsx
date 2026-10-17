import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useDonate } from "@/lib/donate";
import { TIERS, Tier, plansRequest, usePlans } from "@/lib/plans";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

const Plans = () => {
  const { user, token, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const { data } = usePlans(token);
  const { data: donate } = useDonate();
  const [pick, setPick] = useState<Tier | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const me = data?.me;
  const days = data?.plans.days ?? 30;
  const price = (t: Tier) => data?.plans.prices[String(t.id)] ?? 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ["plans"] });

  const choose = (t: Tier) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setPick(t);
  };

  const send = async () => {
    if (!pick) return;
    setBusy(true);
    try {
      await plansRequest(token, { action: "request", tier: pick.id, comment });
      await refresh();
      setPick(null);
      setComment("");
      toast({ title: "Заявка отправлена", description: "Как только перевод подтвердят, подписка включится." });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const toggleMail = async (on: boolean) => {
    try {
      await plansRequest(token, { action: "mail-toggle", on });
      refresh();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast({ title: "Скопировано" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <Link to="/" className="text-muted-foreground hover:text-white text-sm inline-flex items-center gap-1.5 mb-6">
          <Icon name="ArrowLeft" size={15} /> На главную
        </Link>
        <h1 className="font-display text-3xl sm:text-5xl text-white">Подписка на TRADERKA.RU</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Выберите уровень: больше чатов, форум и ежедневная рассылка сводок от AiTraderKa. Подписка действует {days} дней и продлевается новой оплатой.
        </p>

        {me?.sub && (
          <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 flex flex-wrap items-center gap-3">
            <Icon name="BadgeCheck" size={20} className="text-emerald-300" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold">Ваша подписка: {TIERS.find((t) => t.id === me.sub!.tier)?.name}</div>
              <div className="text-sm text-emerald-100/80">Действует до {fmtDate(me.sub.expiresAt)}</div>
            </div>
            {me.sub.tier >= 3 && (
              <label className="flex items-center gap-2 text-sm text-white">
                <Switch checked={me.sub.mailOn} onCheckedChange={toggleMail} />
                Получать рассылку на email
              </label>
            )}
          </div>
        )}
        {me?.last?.status === "pending" && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100 flex items-center gap-2">
            <Icon name="Clock" size={16} /> Заявка на «{TIERS.find((t) => t.id === me.last!.tier)?.name}» на проверке — обычно это занимает немного времени.
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {TIERS.map((t) => {
            const current = me?.sub?.tier === t.id;
            return (
              <div key={t.id} className={`relative rounded-2xl border p-5 flex flex-col ${t.card}`}>
                {t.id === 3 && (
                  <span className="absolute -top-3 right-4 bg-yellow-400 text-yellow-950 text-[10px] font-bold uppercase rounded-full px-2.5 py-1">Максимум</span>
                )}
                <div className={`flex items-center gap-2 ${t.text}`}>
                  <Icon name={t.icon} size={22} />
                  <span className="font-display text-2xl">{t.name}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-white font-display text-4xl tabular">{price(t)}</span>
                  <span className="text-muted-foreground">₽ / {days} дн.</span>
                </div>
                <ul className="mt-4 space-y-2 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Icon name="Check" size={15} className={`mt-0.5 flex-shrink-0 ${t.text}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => choose(t)} className={`mt-5 font-semibold ${t.btn}`}>
                  {current ? "Продлить" : "Оформить"}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Оплата переводом по реквизитам проекта с последующим подтверждением. Автоматическая оплата картой появится позже.
        </p>
      </div>

      <Dialog open={!!pick} onOpenChange={(o) => !o && setPick(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          {pick && (
            <>
              <DialogHeader>
                <DialogTitle className={`flex items-center gap-2 ${pick.text}`}>
                  <Icon name={pick.icon} size={20} /> Подписка «{pick.name}» — {price(pick)} ₽
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  1. Переведите {price(pick)} ₽ по реквизитам ниже. 2. Нажмите «Я перевёл» — подписка включится после проверки.
                </DialogDescription>
              </DialogHeader>
              {donate?.url && (
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeSVG value={donate.url} size={170} level="M" />
                  </div>
                  <Button asChild variant="outline" className="bg-transparent border-input hover:bg-hover hover:text-white">
                    <a href={donate.url} target="_blank" rel="noopener noreferrer">
                      <Icon name="Smartphone" size={16} className="mr-2" /> Перевести через СБП
                    </a>
                  </Button>
                </div>
              )}
              {donate?.details && (
                <div className="bg-rail rounded-lg p-3 flex items-start gap-2">
                  <p className="text-sm text-foreground whitespace-pre-line flex-1 font-mono">{donate.details}</p>
                  <button onClick={() => copy(donate.details)} className="text-muted-foreground hover:text-white" title="Скопировать">
                    <Icon name="Copy" size={15} />
                  </button>
                </div>
              )}
              <textarea
                value={comment}
                maxLength={500}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Комментарий: имя отправителя, время перевода"
                className="w-full h-20 bg-rail rounded px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground resize-none"
              />
              <Button onClick={send} disabled={busy} className={`font-semibold ${pick.btn}`}>
                {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
                Я перевёл
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Plans;
