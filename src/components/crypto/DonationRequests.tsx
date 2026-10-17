import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { DonationRequest, donateRequest } from "@/lib/donate";
import UserAvatar from "./UserAvatar";

const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const STATUS = {
  pending: { label: "ждёт проверки", cls: "bg-amber-400/15 text-amber-200" },
  approved: { label: "подтверждена", cls: "bg-emerald-400/15 text-emerald-200" },
  rejected: { label: "отклонена", cls: "bg-rose-400/15 text-rose-200" },
};

const DonationRequests = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["donate-requests", token];
  const [busy, setBusy] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => donateRequest<{ items: DonationRequest[]; pending: number }>(token, undefined, "&requests=1"),
    refetchInterval: 60_000,
  });

  const decide = async (r: DonationRequest, action: "approve" | "reject") => {
    if (action === "reject" && !window.confirm(`Отклонить заявку ${r.user.name} на ${r.amount.toLocaleString("ru-RU")} ₽?`)) return;
    setBusy(r.id);
    try {
      const res = await donateRequest<{ status: string; promo: string }>(token, { action, id: r.id });
      await qc.invalidateQueries({ queryKey: ["donate-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: action === "approve" ? `${r.user.name} получил значок` : "Заявка отклонена",
        description: action === "approve" && res.promo ? `Промокод: ${res.promo}` : undefined,
      });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const items = data?.items ?? [];
  const pending = items.filter((i) => i.status === "pending");
  const done = items.filter((i) => i.status !== "pending");
  const list = showAll ? [...pending, ...done] : pending;
  const total = items.filter((i) => i.status === "approved").reduce((s, i) => s + i.amount, 0);

  return (
    <section className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Icon name="Inbox" size={18} className="text-emerald-300" />
          Заявки «Я перевёл»
          {pending.length > 0 && <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">{pending.length}</span>}
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {total > 0 && (
            <span>
              Подтверждено: <span className="text-emerald-200 font-mono">{total.toLocaleString("ru-RU")} ₽</span>
            </span>
          )}
          {done.length > 0 && (
            <button onClick={() => setShowAll((v) => !v)} className="hover:text-white underline-offset-2 hover:underline">
              {showAll ? "Только новые" : `История (${done.length})`}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Загружаю…</p>
      ) : list.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 text-center">Новых заявок нет. Сверьте поступления в Ozon Банке, когда они появятся.</p>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <div key={r.id} className="bg-rail/60 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <UserAvatar name={r.user.name} avatar={r.user.avatar} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium truncate">{r.user.name}</span>
                    <span className="font-mono text-emerald-200 font-semibold">{r.amount.toLocaleString("ru-RU")} ₽</span>
                    <span className={`text-[10px] rounded-full px-2 py-0.5 ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground break-words mt-0.5">{r.comment}</p>}
                  <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                    {fmt(r.createdAt)}
                    {r.status === "approved" && r.user.promo && ` · промокод ${r.user.promo}`}
                  </div>
                </div>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    onClick={() => decide(r, "approve")}
                    disabled={busy === r.id}
                    className="font-semibold bg-emerald-500 hover:bg-emerald-400 text-white"
                  >
                    {busy === r.id ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Check" size={16} className="mr-1.5" />}
                    Подтвердить
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => decide(r, "reject")}
                    disabled={busy === r.id}
                    className="text-muted-foreground hover:text-down hover:bg-hover px-2"
                    title="Отклонить"
                  >
                    <Icon name="X" size={16} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default DonationRequests;
