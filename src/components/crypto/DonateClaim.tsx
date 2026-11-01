import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { donateRequest, useMyDonation } from "@/lib/donate";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-emerald-400 placeholder:text-muted-foreground";

const DonateClaim = ({ open }: { open: boolean }) => {
  const { user, token, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const { data: last } = useMyDonation(token, open);
  const [form, setForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.supporter || user?.creator)
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-400/10 border border-emerald-400/25 px-3 py-2.5 text-sm text-emerald-200">
        <Icon name="HeartHandshake" size={16} /> Вы уже поддержали проект — спасибо! Особый промокод в личном кабинете.
      </div>
    );

  if (last?.status === "pending")
    return (
      <div className="flex items-start gap-2 rounded-lg bg-amber-400/10 border border-amber-400/25 px-3 py-2.5 text-sm text-amber-100">
        <Icon name="Clock" size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          Заявка на {last.amount.toLocaleString("ru-RU")} ₽ на проверке. Как только администратор подтвердит перевод, вы получите значок, промокод и доступ в Премиум-чат.
        </span>
      </div>
    );

  const submit = async () => {
    const sum = parseInt(amount.replace(/\D/g, ""), 10);
    if (!sum) {
      toast({ title: "Укажите сумму перевода", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await donateRequest(token, { action: "request", amount: sum, comment });
      await qc.invalidateQueries({ queryKey: ["donate-mine"] });
      setForm(false);
      setAmount("");
      setComment("");
      toast({ title: "Заявка отправлена", description: "Как только перевод подтвердят — получите значок и особый промокод." });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!form)
    return (
      <div className="space-y-1.5">
        {last?.status === "rejected" && (
          <p className="text-xs text-muted-foreground">Прошлая заявка не подтверждена — перевод не нашёлся. Если это ошибка, отправьте заявку ещё раз с комментарием.</p>
        )}
        <Button
          variant="outline"
          onClick={() => (user ? setForm(true) : setAuthOpen(true))}
          className="w-full bg-transparent border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10 hover:text-emerald-100"
        >
          <Icon name="CircleCheck" size={16} className="mr-2" />
          Я перевёл
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          {user ? "Сообщите о переводе — получите значок «Поддержал проект» и особый код BAA" : "Войдите, чтобы сообщить о переводе и получить значок и промокод"}
        </p>
      </div>
    );

  return (
    <div className="rounded-lg bg-rail/60 border border-emerald-400/25 p-3 space-y-2 animate-fade-in">
      <div className="text-white text-sm font-semibold">Сообщить о переводе</div>
      <div className="relative">
        <input
          className={`${inputCls} pr-8`}
          value={amount}
          inputMode="numeric"
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 9))}
          placeholder="Сумма перевода"
          autoFocus
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₽</span>
      </div>
      <textarea
        className={`${inputCls} h-20 py-2 resize-none`}
        value={comment}
        maxLength={500}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий: имя отправителя, время перевода, пожелания"
      />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy || !amount} className="flex-1 font-semibold bg-emerald-500 hover:bg-emerald-400 text-white">
          {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
          Отправить заявку
        </Button>
        <Button variant="ghost" onClick={() => setForm(false)} className="text-muted-foreground hover:text-white hover:bg-hover">
          Отмена
        </Button>
      </div>
    </div>
  );
};

export default DonateClaim;
