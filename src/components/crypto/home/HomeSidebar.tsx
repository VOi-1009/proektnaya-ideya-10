import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/lib/router-compat";
import { useRadars } from "@/lib/radars";
import DonateButton from "@/components/crypto/DonateButton";
import { chatColor, useChatRooms } from "@/lib/chat";
import { CHANNELS, GoFn } from "./homeConfig";

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

  return (
    <aside
      className={`${mobileSidebarOpen ? "flex" : "hidden"} lg:flex w-full lg:w-60 bg-card flex-col flex-shrink-0`}
    >
      <div className="h-12 px-4 border-b border-border flex items-center justify-between shadow-sm">
        <h2 className="text-white font-semibold text-sm">TRADERKA.RU</h2>
        <Button
          variant="ghost"
          className="lg:hidden text-muted-foreground hover:text-white hover:bg-hover p-1 h-auto"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <Icon name="X" size={16} />
        </Button>
      </div>
      <div className="flex-1 p-2 space-y-2">
        <div>
          <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            <Icon name="ChevronDown" size={12} />
            <span>Меню</span>
          </div>
          <div className="mt-0.5 space-y-0">
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                onClick={() => go(c.id)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
                  channel === c.id ? "bg-hover text-white" : "text-muted-foreground hover:text-foreground hover:bg-hover/60"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mx-1 ${c.id === "ainews" ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" : "bg-primary"}`} />
                <span className="text-[14px] truncate">{c.name.replace(/-/g, " ")}</span>
                {c.id === "alerts" && activeAlerts > 0 && (
                  <span className="ml-auto text-[10px] font-mono text-primary">{activeAlerts}</span>
                )}
                {unreadOf(c.id) > 0 && (
                  <span className="ml-auto bg-down text-white text-[9px] font-bold rounded-full px-1.5">
                    {unreadOf(c.id) > 30 ? "30+" : unreadOf(c.id)}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => navigate("/rating")}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors text-muted-foreground hover:text-foreground hover:bg-hover/60"
            >
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mx-1" />
              <span className="text-[14px]">рейтинг</span>
            </button>
            <DonateButton menu />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            <Icon name="ChevronDown" size={12} />
            <span>Чат</span>
          </div>
          <div className="mt-0.5 space-y-1 px-1">
            {(chatRooms ?? []).map((r) => (
              <button
                key={r.id}
                onClick={() => go(`chat-${r.id}`)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors ${
                  channel === `chat-${r.id}` ? chatColor(r.color).active : chatColor(r.color).btn
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${chatColor(r.color).dot}`} />
                <span className="text-[14px] truncate">{r.name}</span>
                {r.access === "list" && <Icon name="Lock" size={12} className="ml-auto opacity-70" />}
              </button>
            ))}
          </div>
        </div>
        {radars && radars.length > 0 && (
          <div>
            <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              <Icon name="ChevronDown" size={12} />
              <span>Радары</span>
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
                  <span className="text-[14px] truncate">{r.title}</span>
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
