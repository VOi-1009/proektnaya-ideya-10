import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Icon from "@/components/ui/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/lib/router-compat";
import { useRadars } from "@/lib/radars";
import DonateButton from "@/components/crypto/DonateButton";
import LangSwitch from "@/components/crypto/LangSwitch";
import TkaBadge from "./TkaBadge";
import { useChatRooms } from "@/lib/chat";
import { GoFn } from "./homeConfig";
import { MenuEntry, mergeMenu, useMenuSettings } from "@/lib/menu";

interface Props {
  channel: string;
  go: GoFn;
  activeAlerts: number;
  unreadOf: (id: string) => number;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
}

const HomeSidebar = ({ channel, go, activeAlerts, unreadOf, mobileSidebarOpen, setMobileSidebarOpen }: Props) => {
  const navigate = useNavigate();
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  const onDownload = (e: React.MouseEvent) => {
    if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 1024) {
      e.preventDefault();
      window.location.href = "/m";
      return;
    }
    setQrUrl(`${window.location.origin}/m`);
  };
  const { data: radars } = useRadars();
  const { data: chatRooms } = useChatRooms();
  const { data: menuCfg } = useMenuSettings();
  const items = mergeMenu(menuCfg, radars, chatRooms).filter((i) => !i.hidden && i.id !== "trading");

  const open = (it: MenuEntry) => {
    if (it.id === "community") return navigate("/community");
    go(it.id);
  };

  const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

  return (
    <aside
      className={`${mobileSidebarOpen ? "flex" : "hidden"} lg:flex w-full lg:w-60 bg-card flex-col flex-shrink-0`}
    >
      <div className="h-12 px-4 flex items-center justify-center relative">
        <div className="flex items-center gap-3 text-muted-foreground">
          <button onClick={() => go("portfolio")} className="hover:text-white relative" aria-label="Ценовые уведомления" title="Ценовые уведомления">
            <Icon name="Bell" size={18} />
            {activeAlerts > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full min-w-[14px] h-[14px] px-0.5 flex items-center justify-center">
                {activeAlerts}
              </span>
            )}
          </button>
          <button onClick={() => go("market")} className="hover:text-white" aria-label="Поиск монет" title="Поиск монет">
            <Icon name="Search" size={18} />
          </button>
          <LangSwitch />
        </div>
        <Button
          variant="ghost"
          className="lg:hidden absolute right-3 text-muted-foreground hover:text-white hover:bg-hover p-1 h-auto"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <Icon name="X" size={16} />
        </Button>
      </div>
      <div className="-mt-2 mb-1 flex justify-center">
        <Popover open={qrOpen} onOpenChange={setQrOpen}>
          <PopoverTrigger asChild>
            <button onClick={onDownload} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
              <Icon name="Download" size={11} />
              Скачать Мобильное приложение
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="center" className="w-48 p-3 flex flex-col items-center gap-2">
            {qrUrl && (
              <div className="bg-white p-2 rounded-lg">
                <QRCodeSVG value={qrUrl} size={140} level="M" />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center leading-snug">Наведите камеру телефона, откроется МВ с кнопкой установки приложения</p>
          </PopoverContent>
        </Popover>
      </div>
      <div className="p-2">
        <div className="px-2 pt-1 pb-5 flex flex-col items-center gap-1.5">
          <span className="text-muted-foreground text-xs text-center">Перейти на трейнинг-биржу</span>
          <button
            onClick={() => go("trading")}
            className="flex items-center justify-center gap-3 rounded-xl bg-primary text-primary-foreground px-6 py-3 shadow-lg shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition"
          >
            <span className="w-9 h-9 rounded-lg bg-background text-primary flex items-center justify-center font-display font-black text-xl leading-none">
              Т
            </span>
            <span className="font-display font-black text-xl tracking-widest">TRADE</span>
          </button>
          <TkaBadge go={go} className="mt-3 flex-col gap-3" />
        </div>
        <div className="mt-0.5 space-y-0">
          {items.map((it) => {
            const label = it.label || it.name;
            const color = it.color || it.defColor;
            const icon = it.icon || it.defIcon;
            const active = channel === it.id;
            const mark = icon ? (
              <Icon name={icon} size={16} fallback="Circle" className="flex-shrink-0 mx-0.5" style={{ color }} />
            ) : (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mx-1"
                style={{ background: color, boxShadow: it.id === "ainews" ? "0 0 6px rgba(255,255,255,0.7)" : undefined }}
              />
            );

            if (it.id === "donate") return <DonateButton key={it.id} menu label={it.label} color={color} icon={icon} />;

            if (it.id === "community" || it.id === "trading") {
              return (
                <button
                  key={it.id}
                  onClick={() => open(it)}
                  className={`group w-full flex items-center gap-2 px-2 py-1 my-px rounded-md text-left transition-colors border ${active ? "text-white" : "hover:text-white"}`}
                  style={{
                    color: active ? undefined : color,
                    background: tint(color, active ? 20 : 10),
                    borderColor: tint(color, active ? 60 : 30),
                  }}
                >
                  {it.id === "trading" && !icon ? (
                    <span className="w-4 h-4 mx-0.5 flex-shrink-0 rounded bg-primary flex items-center justify-center text-white font-display font-black text-[10px] leading-none">
                      Т
                    </span>
                  ) : (
                    <Icon name={icon || "Circle"} size={16} fallback="Circle" className="flex-shrink-0 mx-0.5" style={{ color }} />
                  )}
                  <span className="text-[14px] font-semibold truncate">{label}</span>
                  <span className="ml-auto relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping" style={{ background: color }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
                  </span>
                </button>
              );
            }

            return (
              <button
                key={it.id}
                onClick={() => open(it)}
                className={`w-full flex items-center gap-2 px-2 py-0.5 rounded text-left transition-colors ${
                  active ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-hover/60"
                }`}
              >
                {mark}
                <span className="text-[14px] truncate">{label}</span>
                {it.id === "alerts" && activeAlerts > 0 && <span className="ml-auto text-[10px] font-mono text-primary">{activeAlerts}</span>}
                {unreadOf(it.id) > 0 && (
                  <span className="ml-auto bg-down text-white text-[9px] font-bold rounded-full px-1.5">
                    {unreadOf(it.id) > 30 ? "30+" : unreadOf(it.id)}
                  </span>
                )}
                {it.locked && <Icon name="Lock" size={12} className="ml-auto opacity-70" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-[160px] mx-4 mt-3 border-t border-primary p-2 flex flex-col gap-2" />
    </aside>
  );
};

export default HomeSidebar;