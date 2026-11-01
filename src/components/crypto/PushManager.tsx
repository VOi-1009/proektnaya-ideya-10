import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { PushStats, pushRequest } from "@/lib/push";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";
const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-start gap-3 cursor-pointer">
    <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    <span>
      <span className="text-sm text-white block">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </span>
  </label>
);

const PushManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["push-admin", token];
  const { data } = useQuery({ queryKey: key, queryFn: () => pushRequest<PushStats>(token, "&admin=1"), refetchInterval: 60_000 });
  const [s, setS] = useState<PushStats["settings"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ title: "", body: "", url: "/m" });

  useEffect(() => {
    if (data && !s) setS(data.settings);
  }, [data, s]);

  const run = async (body: object, ok: string) => {
    setBusy(true);
    try {
      const r = await pushRequest<{ queued?: number; sent?: number }>(token, "", body);
      qc.invalidateQueries({ queryKey: ["push-admin"] });
      toast({ title: ok, description: r.queued !== undefined ? `Получателей: ${r.queued}, доставлено сразу: ${r.sent ?? 0}` : undefined });
      return true;
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!data || !s) return <p className="text-muted-foreground text-sm">Загружаю…</p>;

  return (
    <section className="bg-card border border-primary/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Icon name="BellRing" size={18} className="text-primary" /> Пуш-уведомления · установленное приложение
        </h2>
        <label className="flex items-center gap-2 text-sm text-white">
          <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
          {s.enabled ? "Уведомления включены" : "Уведомления выключены"}
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Toggle label="Ежедневная сводка (00:05)" hint="Bitcoin, Ethereum, Brent, Gold" checked={s.daily} onChange={(v) => setS({ ...s, daily: v })} />
        <Toggle label="Дайджесты и публикации AiTKA" hint="Автодайджесты, движения рынка и публикации, отправленные вручную" checked={s.digest} onChange={(v) => setS({ ...s, digest: v })} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          ["Подписчиков", data.subscribers],
          ["Из них с аккаунтом", data.withAccount],
          ["Доставлено", data.sent],
          ["В очереди", data.pending],
          ["Ошибок", data.failed],
        ].map(([label, v]) => (
          <div key={String(label)} className="bg-rail/60 rounded-lg px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{label}</div>
            <div className="text-white font-mono">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run({ action: "settings", ...s }, "Настройки уведомлений сохранены")} disabled={busy} className="font-semibold">
          Сохранить
        </Button>
        <Button variant="outline" disabled={busy || data.pending === 0} onClick={() => run({ action: "process" }, "Очередь обработана")} className="bg-transparent border-input hover:bg-hover hover:text-white">
          <Icon name="Send" size={14} className="mr-1.5" /> Отправить очередь сейчас
        </Button>
        {data.failed > 0 && (
          <Button variant="ghost" disabled={busy} onClick={() => run({ action: "retry" }, "Неудачные вернулись в очередь")} className="text-muted-foreground hover:text-white hover:bg-hover">
            Повторить неудачные
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-rail/40 p-3 space-y-2">
        <h3 className="text-white text-sm font-semibold flex items-center gap-2">
          <Icon name="PenLine" size={15} className="text-primary" /> Своё уведомление
        </h3>
        <p className="text-xs text-muted-foreground">Уйдёт всем, кто включил уведомления в приложении. На пост оно не влияет.</p>
        <input className={inputCls} value={msg.title} maxLength={120} onChange={(e) => setMsg({ ...msg, title: e.target.value })} placeholder="Заголовок" />
        <textarea className={`${inputCls} h-20 py-2 resize-y`} value={msg.body} maxLength={400} onChange={(e) => setMsg({ ...msg, body: e.target.value })} placeholder="Текст (до 400 символов)" />
        <input className={inputCls} value={msg.url} maxLength={300} onChange={(e) => setMsg({ ...msg, url: e.target.value })} placeholder="Куда откроется: /m или https://…" />
        <Button
          disabled={busy || msg.title.trim().length < 2 || data.subscribers === 0}
          onClick={async () => (await run({ action: "send", ...msg }, "Уведомление отправлено")) && setMsg({ title: "", body: "", url: "/m" })}
          className="font-semibold"
        >
          <Icon name="Send" size={14} className="mr-1.5" /> Разослать {data.subscribers > 0 ? `(${data.subscribers})` : ""}
        </Button>
        {data.subscribers === 0 && <p className="text-xs text-muted-foreground">Пока нет подписчиков: они появятся, когда участники включат уведомления на главной экране приложения.</p>}
      </div>

      {data.messages.length > 0 && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer hover:text-white">Последние рассылки ({data.messages.length})</summary>
          <div className="mt-2 space-y-1">
            {data.messages.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <Icon name={m.failed ? "CircleX" : m.pending ? "Clock" : "CircleCheck"} size={13} className={m.failed ? "text-down" : m.pending ? "text-muted-foreground" : "text-up"} />
                <span className="text-white truncate flex-1">{m.title}</span>
                <span className="text-muted-foreground font-mono flex-shrink-0">{m.sent}/{m.sent + m.pending + m.failed}</span>
                <span className="text-muted-foreground font-mono flex-shrink-0">{fmt(m.createdAt)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
};

export default PushManager;
