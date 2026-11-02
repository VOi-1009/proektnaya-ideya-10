import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { fundFmt } from "@/lib/fund";
import { refLink, useReferralInfo, useReferralMe } from "@/lib/referral";

const SOURCES = [
  { id: "/", label: "Сайт", icon: "Globe" },
  { id: "/m", label: "Мобильная версия", icon: "Smartphone" },
  { id: "/m?source=app", label: "Приложение", icon: "AppWindow" },
] as const;

interface Props {
  compact?: boolean;
}

const ReferralCard = ({ compact }: Props) => {
  const { user, token, setAuthOpen } = useAuth();
  const { data: info } = useReferralInfo();
  const { data: me, isLoading } = useReferralMe(token);
  const [src, setSrc] = useState<(typeof SOURCES)[number]["id"]>("/");

  if (!info || !info.enabled) return null;

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} скопирован` });
    } catch {
      toast({ title: "Не удалось скопировать", description: text, variant: "destructive" });
    }
  };

  const share = async (url: string) => {
    const text = `Присоединяйся к TRADERKA.RU: крипто сообщество, тренировочная биржа и мини-игры. Мой промокод ${me?.code ?? ""}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "TRADERKA.RU", text, url });
        return;
      } catch {
        return;
      }
    }
    copy(`${text} ${url}`, "Приглашение");
  };

  const reward = (
    <div className="grid grid-cols-3 gap-2 text-center">
      {[
        ["TKA", info.rewardTka],
        ["USDT", info.rewardUsdt],
        ["В фонд", info.fundTka],
      ].map(([l, v]) => (
        <div key={String(l)} className="rounded-lg bg-rail/60 px-2 py-2 min-w-0">
          <div className="font-mono text-white text-sm truncate">+{fundFmt(Number(v))}</div>
          <div className="text-[10px] text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );

  return (
    <section className={`rounded-xl border border-primary/30 bg-card ${compact ? "p-3" : "p-4"} space-y-3`}>
      <div className="flex items-center gap-2">
        <Icon name="UserPlus" size={compact ? 15 : 17} className="text-primary" />
        <h3 className="text-white font-semibold text-sm">{info.title}</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">за каждого друга</span>
      </div>
      {reward}
      {!compact && <p className="text-xs text-muted-foreground leading-relaxed">{info.text}</p>}

      {!user ? (
        <Button className="w-full font-semibold" onClick={() => setAuthOpen(true)}>
          Войти и получить ссылку
        </Button>
      ) : isLoading || !me ? (
        <Skeleton className="h-24 w-full bg-rail" />
      ) : (
        <>
          <div className="flex gap-1">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSrc(s.id)}
                className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md border px-1.5 py-1.5 text-[11px] transition-colors ${src === s.id ? "border-primary bg-primary/15 text-white font-semibold" : "border-border text-muted-foreground"}`}
              >
                <Icon name={s.icon} size={12} /> {s.label}
              </button>
            ))}
          </div>
          <div className="rounded-lg bg-rail px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-white font-mono truncate flex-1">{refLink(me.code, src)}</span>
            <button onClick={() => copy(refLink(me.code, src), "Ссылка")} className="text-primary flex-shrink-0" aria-label="Скопировать ссылку">
              <Icon name="Copy" size={15} />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copy(me.code, "Промокод")}
              className="flex-1 flex items-center justify-between gap-2 rounded-lg border-2 border-dashed border-emerald-400/50 bg-emerald-400/10 px-3 py-2"
              title="Скопировать промокод"
            >
              <span className="font-mono font-bold tracking-widest text-emerald-200">{me.code}</span>
              <Icon name="Copy" size={14} className="text-emerald-300/70" />
            </button>
            <Button className="font-semibold" onClick={() => share(refLink(me.code, src))}>
              <Icon name="Share2" size={14} className="mr-1.5" /> Отправить
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-rail/60 py-1.5">
              <div className="font-mono text-white text-sm">{me.invited}</div>
              <div className="text-[10px] text-muted-foreground">пришло</div>
            </div>
            <div className="rounded-lg bg-rail/60 py-1.5">
              <div className="font-mono text-[#16C784] text-sm">{me.paid}</div>
              <div className="text-[10px] text-muted-foreground">с наградой</div>
            </div>
            <div className="rounded-lg bg-rail/60 py-1.5 min-w-0">
              <div className="font-mono text-white text-sm truncate">{fundFmt(me.earnedTka)}</div>
              <div className="text-[10px] text-muted-foreground">TKA получено</div>
            </div>
          </div>
          {me.left !== null && <p className="text-[11px] text-muted-foreground">Можно пригласить ещё: {me.left}.</p>}
          {!compact && me.friends.length > 0 && (
            <div className="divide-y divide-border">
              {me.friends.map((f, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                  <Icon name={f.status === "paid" ? "CircleCheck" : "Clock"} size={14} className={f.status === "paid" ? "text-[#16C784]" : "text-muted-foreground"} />
                  <span className="text-white truncate flex-1">{f.name}</span>
                  <span className="text-[11px] text-muted-foreground">{f.status === "paid" ? `+${fundFmt(f.reward)} TKA` : "ждём первую сделку"}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ReferralCard;
