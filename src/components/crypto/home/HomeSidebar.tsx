import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/crypto/UserAvatar";
import StatusBadge from "@/components/crypto/StatusBadge";
import FounderBadge from "@/components/crypto/FounderBadge";
import SupporterBadge from "@/components/crypto/SupporterBadge";
import RadarDialog from "@/components/crypto/RadarDialog";
import { Radar, useRadars } from "@/lib/radars";
import { CHAT_ROOMS } from "@/lib/chat";
import { CHANNELS, GoFn } from "./homeConfig";

interface Props {
  channel: string;
  go: GoFn;
  activeAlerts: number;
  unreadOf: (id: string) => number;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  favsCount: number;
}

const HomeSidebar = ({ channel, go, activeAlerts, unreadOf, mobileSidebarOpen, setMobileSidebarOpen, favsCount }: Props) => {
  const { user, logout, setAuthOpen } = useAuth();
  const navigate = useNavigate();
  const { data: radars } = useRadars();
  const [radar, setRadar] = useState<Radar | null>(null);

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
            <span>Текстовые каналы</span>
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
                <span className="text-[14px] truncate">{c.name}</span>
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
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            <Icon name="ChevronDown" size={12} />
            <span>Чат</span>
          </div>
          <div className="mt-0.5 space-y-1 px-1">
            {CHAT_ROOMS.map((r) => (
              <button
                key={r.id}
                onClick={() => go(`chat-${r.id}`)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors ${
                  channel === `chat-${r.id}` ? r.active : r.btn
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.dot}`} />
                <span className="text-[14px] truncate">{r.name}</span>
                {r.id === "premium" && <Icon name="Crown" size={12} className="ml-auto text-amber-300" />}
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
                  onClick={() => setRadar(r)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors text-muted-foreground hover:text-foreground hover:bg-hover/60"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mx-1" style={{ background: r.color }} />
                  <span className="text-[14px] truncate">{r.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <RadarDialog radar={radar} onClose={() => setRadar(null)} />
      <div className="p-2 bg-rail/70 flex items-center gap-2">
        <button
          onClick={() => (user ? navigate("/profile") : setAuthOpen(true))}
          className="relative"
          title={user ? "Личный кабинет" : "Войти"}
        >
          {user ? (
            <UserAvatar name={user.name} email={user.email} avatar={user.avatar} />
          ) : (
            <UserAvatar />
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-card rounded-full ${user ? "bg-up" : "bg-muted-foreground"}`} />
        </button>
        <button
          onClick={() => (user ? navigate("/profile") : setAuthOpen(true))}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-white text-sm font-medium truncate">{user ? user.name || user.email : "Гость"}</span>
            {user && <StatusBadge level={user.level} compact />}
            {user && <SupporterBadge no={user.supporter} creator={user.creator} compact />}
            {user && <FounderBadge no={user.founder} compact />}
          </div>
          <div className="text-muted-foreground text-xs truncate hover:text-primary">
            {user ? "Личный кабинет →" : `Избранных: ${favsCount}`}
          </div>
        </button>
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 hover:bg-hover text-muted-foreground hover:text-down"
            onClick={() => {
              logout();
              toast({ title: "Вы вышли из аккаунта" });
            }}
            aria-label="Выйти"
            title="Выйти"
          >
            <Icon name="LogOut" size={16} />
          </Button>
        ) : (
          <Button size="sm" className="h-8 px-3 font-semibold" onClick={() => setAuthOpen(true)}>
            Войти
          </Button>
        )}
      </div>
    </aside>
  );
};

export default HomeSidebar;
