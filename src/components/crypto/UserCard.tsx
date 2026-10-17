import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { COIN_META } from "@/lib/crypto";
import { LEVELS, nameCls } from "@/lib/status";
import { AdminUser, usersRequest } from "@/lib/users";
import MemberIcon from "./MemberIcon";
import StatusBadge from "./StatusBadge";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const QUICK = [100, 500, 1000, 5000];

interface Props {
  user: AdminUser | null;
  token: string | null;
  isMe: boolean;
  onClose: () => void;
  onChange: (u: AdminUser) => void;
  onStatus: (u: AdminUser, value: string) => void;
  onDelete: (u: AdminUser) => void;
}

const UserCard = ({ user: u, token, isMe, onClose, onChange, onStatus, onDelete }: Props) => {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const gift = async (value: number) => {
    if (!u || !value) return;
    setBusy(true);
    try {
      const { user } = await usersRequest<{ user: AdminUser }>(token, "", { action: "gift-points", userId: u.id, amount: value });
      onChange(user);
      setAmount("");
      toast({
        title: value > 0 ? `${user.name}: +${value.toLocaleString("ru-RU")} очков` : `${user.name}: ${value.toLocaleString("ru-RU")} очков`,
        description: `Теперь ${user.points.toLocaleString("ru-RU")} очков · статус «${user.title}»`,
      });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const typed = parseInt(amount.replace(/\s/g, ""), 10);

  return (
    <Dialog open={!!u} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        {u && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <MemberIcon name={u.name} level={u.level} avatar={u.avatar} className="w-16 h-16 text-2xl" iconSize={28} />
                <div className="min-w-0 text-left">
                  <DialogTitle className={`text-xl truncate ${nameCls(u.level)}`}>{u.name}</DialogTitle>
                  <DialogDescription asChild>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge level={u.level} compact />
                      {u.isAdmin && <span className="text-xs text-primary">администратор</span>}
                      {isMe && <span className="text-xs text-muted-foreground">это вы</span>}
                    </div>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Почта", u.email || "—"],
                ["Город", u.city || "—"],
                ["Любимая монета", u.favoriteCoin ? COIN_META[u.favoriteCoin]?.ru ?? u.favoriteCoin : "—"],
                ["Регистрация", fmtDate(u.createdAt)],
                ["Последний визит", fmtDate(u.lastSeen)],
                ["Статус по очкам", u.autoTitle],
              ].map(([k, v]) => (
                <div key={k} className="bg-rail/60 rounded-lg px-3 py-2 min-w-0">
                  <div className="text-muted-foreground text-[11px]">{k}</div>
                  <div className="text-white truncate">{v}</div>
                </div>
              ))}
            </div>
            {u.bio && <p className="text-sm text-muted-foreground bg-rail/60 rounded-lg px-3 py-2">{u.bio}</p>}

            <section className="bg-rail/60 rounded-lg p-3 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-white font-semibold text-sm flex items-center gap-1.5">
                  <Icon name="Gift" size={16} className="text-primary" /> Очки активности
                </div>
                <div className="font-mono text-white tabular">{u.points.toLocaleString("ru-RU")}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Из них подарено администратором: <span className="text-white font-mono">{u.bonus.toLocaleString("ru-RU")}</span>
                {u.next !== null && u.nextTitle && (
                  <>
                    {" "}· до «{u.nextTitle}» осталось{" "}
                    <span className="text-white font-mono">{(u.next - u.points).toLocaleString("ru-RU")}</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK.map((n) => (
                  <button
                    key={n}
                    disabled={busy}
                    onClick={() => gift(n)}
                    className="px-2.5 py-1 rounded bg-primary/15 text-primary text-xs font-mono hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                  >
                    +{n.toLocaleString("ru-RU")}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={amount}
                  inputMode="numeric"
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))}
                  placeholder="Своё количество, например 250 или -100"
                />
                <Button onClick={() => gift(typed)} disabled={busy || !typed} className="font-semibold flex-shrink-0">
                  {busy ? <Icon name="Loader2" size={16} className="animate-spin" /> : "Начислить"}
                </Button>
              </div>
              {u.manual && (
                <div className="text-[11px] text-muted-foreground">
                  Статус закреплён вручную — очки копятся, но статус сменится, только если вернуть «Авто».
                </div>
              )}
            </section>

            <section className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Статус</div>
              <select className={inputCls} value={u.manual ? String(u.level) : "auto"} onChange={(e) => onStatus(u, e.target.value)}>
                <option value="auto">Авто (по активности)</option>
                {LEVELS.map((l, i) => (
                  <option key={l.title} value={i + 1}>
                    {l.title}
                  </option>
                ))}
              </select>
            </section>

            {!isMe && !u.isAdmin && (
              <Button
                variant="outline"
                onClick={() => onDelete(u)}
                className="w-full bg-transparent border-down/40 text-down hover:bg-down/10 hover:text-down"
              >
                <Icon name="Trash2" size={16} className="mr-1.5" />
                Удалить пользователя
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserCard;
