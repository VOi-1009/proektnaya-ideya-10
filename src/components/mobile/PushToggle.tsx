import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { usePush } from "@/lib/push";

const HINT: Record<string, string> = {
  unsupported: "Этот браузер не поддерживает уведомления.",
  "ios-install": "На iPhone уведомления работают только в установленном приложении: нажмите «Поделиться» и «На экран Домой», затем откройте приложение с экрана.",
  denied: "Уведомления заблокированы в настройках браузера. Разрешите их для этого сайта, чтобы включить.",
};

const PushToggle = () => {
  const { state, busy, enable, disable } = usePush();
  if (state === "loading") return null;

  const on = state === "on";
  const blocked = state === "unsupported" || state === "ios-install" || state === "denied";

  const click = async () => {
    if (on) {
      await disable();
      return toast({ title: "Уведомления выключены" });
    }
    const ok = await enable();
    if (ok) toast({ title: "Уведомления включены", description: "Новые посты AiTKA придут на устройство." });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? "bg-primary/20 text-primary" : "bg-rail text-muted-foreground"}`}>
        <Icon name={on ? "BellRing" : "Bell"} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold leading-snug">Уведомления от AiTKA</div>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5">
          {blocked ? HINT[state] : on ? "Включены: новые посты и сводки придут на это устройство." : "Узнавайте о новых постах и сводках рынка сразу, даже когда сайт закрыт."}
        </p>
      </div>
      {!blocked && (
        <Button size="sm" variant={on ? "outline" : "default"} disabled={busy} onClick={click} className={`flex-shrink-0 font-semibold ${on ? "bg-transparent" : ""}`}>
          {busy && <Icon name="Loader2" size={14} className="mr-1.5 animate-spin" />}
          {on ? "Выключить" : "Включить"}
        </Button>
      )}
    </div>
  );
};

export default PushToggle;
