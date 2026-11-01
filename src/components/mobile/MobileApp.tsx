import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useGraphics } from "@/lib/graphics";
import { fundFmt, MOBILE_SECTIONS, useMobileSettings } from "@/lib/fund";
import { useWallet } from "@/lib/tka";
import MobileBlockView from "./MobileBlockView";
import InstallBanner from "./InstallBanner";
import { chooseDesktop, chooseMobile } from "@/lib/mobile";
import TkaIcon from "@/components/crypto/TkaIcon";

const MobileApp = () => {
  const { user, setAuthOpen, logout } = useAuth();
  const { data, isLoading } = useMobileSettings();
  const { data: gfx } = useGraphics();
  const [tab, setTab] = useState("");
  const s = data?.settings;
  const tabs = (s?.tabs ?? []).filter((t) => t.enabled);
  const first = tabs.find((t) => t.id === "home") ?? tabs[0];
  const current = tabs.find((t) => t.id === tab) ?? first;

  useEffect(() => {
    chooseMobile();
  }, []);

  useEffect(() => {
    if (!tab && first) setTab(first.id);
  }, [tab, first]);

  if (isLoading || !s) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-3">
        <Skeleton className="h-12 w-full bg-card" />
        <Skeleton className="h-24 w-full bg-card" />
        <Skeleton className="h-24 w-full bg-card" />
      </div>
    );
  }

  if (!s.enabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Icon name="Smartphone" size={36} className="text-primary" />
        <h1 className="font-display text-xl text-white">Мобильная версия закрыта</h1>
        <p className="text-sm text-muted-foreground max-w-xs">{s.message || "Скоро откроем. Пока можно пользоваться полной версией сайта."}</p>
        <a href="/" className="text-primary text-sm hover:underline">Открыть полную версию</a>
      </div>
    );
  }

  const blocks = s.blocks.filter((b) => b.tab === current?.id && b.enabled);
  const info = current ? MOBILE_SECTIONS[current.id] : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {gfx?.logo ? (
            <img src={gfx.logo} alt="" className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-display font-black">Т</div>
          )}
          <span className="font-display text-base text-white tracking-wide">{s.title}</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <button onClick={() => setTab("profile")} className="text-xs text-muted-foreground flex items-center gap-1.5" aria-label="Профиль">
              <TkaIcon size={16} /> <WalletValue />
            </button>
          )}
          <button
            onClick={() => (user ? logout() : setAuthOpen(true))}
            className={user ? "text-xs text-muted-foreground hover:text-white flex items-center gap-1 border border-border rounded-md px-2 py-1" : "text-xs text-primary-foreground bg-primary font-semibold rounded-md px-3 py-1"}
          >
            {user && <Icon name="LogOut" size={12} />}
            {user ? "Выйти" : "Войти"}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 space-y-3">
        <a href="/?full=1" onClick={() => chooseDesktop()} className="text-[11px] text-muted-foreground hover:text-white inline-flex items-center gap-1">
          <Icon name="Monitor" size={12} /> Полная версия сайта
        </a>
        {s.app.install && <InstallBanner text={s.app.text} />}
        <h1 className="font-display text-lg text-white flex items-center gap-2">
          {info && <Icon name={current?.icon || info.icon} size={18} className="text-primary" />}
          {current?.label || info?.label}
        </h1>
        {blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground py-10">Здесь пока ничего нет</div>
        ) : (
          blocks.map((b) => <MobileBlockView key={b.id} block={b} preview />)
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border grid items-end" style={{ gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))` }}>
        {tabs.map((t, i) => {
          const center = tabs.length % 2 === 1 && tabs.length >= 3 && i === (tabs.length - 1) / 2;
          const active = current?.id === t.id;
          const icon = t.icon || MOBILE_SECTIONS[t.id]?.icon || "Circle";
          const label = t.label || MOBILE_SECTIONS[t.id]?.label;
          if (center) {
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center justify-end gap-0.5 pb-1.5 text-[11px] font-semibold" aria-label={label}>
                <span
                  className={`-mt-6 w-14 h-14 rounded-full flex items-center justify-center bg-primary text-white ring-4 ring-card transition-transform active:scale-95 ${active ? "scale-105" : ""}`}
                  style={{ boxShadow: "0 0 18px 4px hsl(var(--primary) / 0.65), 0 0 36px 8px hsl(var(--primary) / 0.3)" }}
                >
                  <Icon name={icon} size={28} fallback="Circle" />
                </span>
                <span className={`truncate max-w-full px-1 ${active ? "text-primary" : "text-white"}`}>{label}</span>
              </button>
            );
          }
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center justify-center gap-0.5 ${s.bigButtons ? "py-3" : "py-2"} text-[11px] transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon name={icon} size={s.bigButtons ? 22 : 18} fallback="Circle" />
              <span className="truncate max-w-full px-1">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

const WalletValue = () => {
  const { token } = useAuth();
  const { data } = useWallet(token);
  return <span className="font-mono text-white">{data ? fundFmt(data.free) : "—"}</span>;
};

export default MobileApp;
