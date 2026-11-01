import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useGraphics } from "@/lib/graphics";

interface PromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const KEY = "app-install-dismissed";

const InstallBanner = ({ text }: { text: string }) => {
  const { data: gfx } = useGraphics();
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (standalone || dismissed) return;
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    setHidden(false);
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      return;
    }
  };

  const install = async () => {
    if (evt) {
      await evt.prompt();
      const c = await evt.userChoice;
      if (c.outcome === "accepted") close();
      setEvt(null);
    } else {
      setHelp((v) => !v);
    }
  };

  if (hidden) return null;
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <img src={gfx?.appIcon || "/app-icons/icon-192.png"} alt="" className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-white text-sm font-semibold leading-tight">{text}</div>
          <div className="text-[11px] text-muted-foreground">Откроется как приложение, без адресной строки</div>
        </div>
        <button onClick={close} className="text-muted-foreground hover:text-white self-start" aria-label="Скрыть"><Icon name="X" size={16} /></button>
      </div>
      <Button size="sm" className="w-full font-semibold" onClick={install}>
        <Icon name="Download" size={15} className="mr-1.5" /> Установить приложение
      </Button>
      {help && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {ios
            ? "На iPhone: нажмите «Поделиться» в Safari, затем «На экран Домой»."
            : "В меню браузера (три точки) выберите «Установить приложение» или «Добавить на главный экран»."}
        </p>
      )}
    </div>
  );
};

export default InstallBanner;
