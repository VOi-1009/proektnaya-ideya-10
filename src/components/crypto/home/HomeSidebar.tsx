import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/lib/router-compat";
import { useRadars } from "@/lib/radars";
import DonateButton from "@/components/crypto/DonateButton";
import LangSwitch from "@/components/crypto/LangSwitch";
import { chatColor, useChatRooms } from "@/lib/chat";
import { GoFn } from "./homeConfig";
import { BASE_ITEMS, DEFAULT_MENU_TITLE, DEFAULT_RADARS_TITLE, mergeMenu, useMenuSettings } from "@/lib/menu";

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
  const { data: radars } = useRadars();
  const { data: chatRooms } = useChatRooms();
  const { data: menuCfg } = useMenuSettings();
  const items = mergeMenu(menuCfg).filter((i) => !i.hidden);
  const radarsFirst = !!menuCfg?.radarsFirst;

  return (
    <aside
      className={`${mobileSidebarOpen ? "flex" : "hidden"} lg:flex w-full lg:w-60 bg-card flex-col flex-shrink-0`}
    >
      <div className="h-12 px-4 flex items-center justify-center relative">
        <div className="flex items-center gap-3 text-muted-foreground">
          <button onClick={() => go("alerts")} className="hover:text-white relative" aria-label="Ценовые уведомления" title="Ценовые уведомления">
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
      <div className="flex-1 p-2 flex flex-col gap-2">
        <div className={radarsFirst ? "order-2" : "order-1"}>
          <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            <Icon name="ChevronDown" size={12} />
            <span>{menuCfg?.menuTitle || DEFAULT_MENU_TITLE}</span>
          </div>
          <div className="mt-0.5 space-y-0">
            {items.map((it) => {
              const label = it.label || BASE_ITEMS.find((b) => b.id === it.id)?.name || it.id;
              if (it.id === "donate") return <DonateButton key={it.id} menu label={it.label} />;
              if (it.id === "community") {
                const active = channel === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => navigate("/community")}
                    className={`group w-full flex items-center gap-2 px-2 py-1.5 my-0.5 rounded-md text-left transition-colors border ${
                      active
                        ? "bg-metric-sky/20 border-metric-sky/60 text-white"
                        : "bg-metric-sky/10 border-metric-sky/30 text-metric-sky hover:bg-metric-sky/20 hover:text-white"
                    }`}
                  >
                    <Icon name="MessagesSquare" size={16} className="flex-shrink-0 mx-0.5 text-metric-sky" />
                    <span className="text-[14px] font-semibold">{label}</span>
                    <span className="ml-auto relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-metric-sky opacity-70 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-metric-sky" />
                    </span>
                  </button>
                );
              }
              if (it.id === "trading") {
                const active = channel === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => go(it.id)}
                    className={`group w-full flex items-center gap-2 px-2 py-1.5 my-0.5 rounded-md text-left transition-colors border ${
                      active
                        ? "bg-[#22C55E]/20 border-[#22C55E]/60 text-white"
                        : "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/20 hover:text-white"
                    }`}
                  >
                    <span className="w-4 h-4 mx-0.5 flex-shrink-0 rounded bg-primary flex items-center justify-center text-white font-display font-black text-[10px] leading-none">
                      Т
                    </span>
                    <span className="text-[14px] font-semibold truncate">{label}</span>
                    <span className="ml-auto relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-70 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
                    </span>
                  </button>
                );
              }
              if (it.id === "rating") {
                return (
                  <button
                    key={it.id}
                    onClick={() => navigate("/rating")}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
                      channel === it.id ? "bg-hover text-white" : "text-muted-foreground hover:text-foreground hover:bg-hover/60"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mx-1" />
                    <span className="text-[14px]">{label}</span>
                  </button>
                );
              }
              return (
                <button
                  key={it.id}
                  onClick={() => go(it.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
                    channel === it.id ? "bg-hover text-white" : "text-muted-foreground hover:text-foreground hover:bg-hover/60"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 mx-1 ${it.id === "ainews" ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" : it.id === "portfolio" ? "bg-[#A78BFA]" : "bg-primary"}`} />
                  <span className="text-[14px] truncate">{label}</span>
                  {it.id === "alerts" && activeAlerts > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-primary">{activeAlerts}</span>
                  )}
                  {unreadOf(it.id) > 0 && (
                    <span className="ml-auto bg-down text-white text-[9px] font-bold rounded-full px-1.5">
                      {unreadOf(it.id) > 30 ? "30+" : unreadOf(it.id)}
                    </span>
                  )}
                </button>
              );
            })}
            {(chatRooms ?? []).map((r) => (
              <button
                key={r.id}
                onClick={() => go(`chat-${r.id}`)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
                  channel === `chat-${r.id}` ? "bg-hover text-white" : "text-muted-foreground hover:text-foreground hover:bg-hover/60"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mx-1 ${chatColor(r.color).dot}`} />
                <span className="text-[14px] truncate">{r.name}</span>
                {r.access === "list" && <Icon name="Lock" size={12} className="ml-auto opacity-70" />}
              </button>
            ))}
          </div>
        </div>
        {radars && radars.length > 0 && (
          <div className={radarsFirst ? "order-1" : "order-2"}>
            <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              <Icon name="ChevronDown" size={12} />
              <span>{menuCfg?.radarsTitle || DEFAULT_RADARS_TITLE}</span>
            </div>
            <div className="mt-0.5 space-y-0">
              {radars.map((r) => (
                <button
                  key={r.id}
                  onClick={() => go(`radar-${r.id}`)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
                    channel === `radar-${r.id}` ? "bg-hover text-white" : "text-muted-foreground hover:text-foreground hover:bg-hover/60"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mx-1" style={{ background: r.color }} />
                  <span className="text-[14px] truncate">{r.title.replace(/-/g, " ")}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default HomeSidebar;