import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/crypto/UserAvatar";
import StatusBadge from "@/components/crypto/StatusBadge";
import FounderBadge from "@/components/crypto/FounderBadge";
import SupporterBadge from "@/components/crypto/SupporterBadge";
import DonateButton from "@/components/crypto/DonateButton";
import TierBadge from "@/components/crypto/TierBadge";
import { CHANNELS, GoFn } from "./homeConfig";

interface Props {
  channel: string;
  go: GoFn;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
}

const HomeNav = ({ channel, go, mobileMenuOpen, setMobileMenuOpen }: Props) => {
  const { user, setAuthOpen } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <button onClick={() => go("welcome")} className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl sm:text-2xl leading-none">
            Т
          </div>
          <div className="text-left">
            <h1 className="font-display text-lg sm:text-xl text-white leading-none tracking-wide">TRADERKA<span className="text-primary">.RU</span></h1>
            <p className="text-xs text-muted-foreground hidden sm:block mt-1">Котировки, графики и новости крипторынка</p>
          </div>
        </button>
        <div className="hidden md:flex items-center gap-0.5">
          <div className="flex items-center gap-0.5 lg:hidden 2xl:flex">
          {CHANNELS.slice(1).filter((c) => c.id !== "ainews").map((c) => (
            <Button
              key={c.id}
              variant="ghost"
              onClick={() => go(c.id)}
              className={`h-8 px-2 text-[13px] hover:bg-hover hover:text-white ${channel === c.id ? "text-white bg-hover" : "text-muted-foreground"}`}
            >
              {"short" in c && c.short ? c.short : (c.name[0].toUpperCase() + c.name.slice(1)).replace("-", " ")}
            </Button>
          ))}
          </div>
          <Button variant="ghost" asChild className="h-8 px-2 text-[13px] text-muted-foreground hover:text-white hover:bg-hover" title="Канал в MAX">
            <a href="https://max.ru/join/NlGkb3arf9YBdWjvXf-a5gVYZdEOEYGX6A79q2w7LEg" target="_blank" rel="noreferrer">
              <Icon name="MessageCircle" size={14} className="xl:mr-1.5" />
              <span className="hidden xl:inline">MAX</span>
            </a>
          </Button>
          {user ? (
            <Button variant="ghost" onClick={() => navigate("/profile")} className="h-8 text-muted-foreground hover:text-white hover:bg-hover px-2 gap-2" title="Личный кабинет">
              <UserAvatar name={user.name} email={user.email} avatar={user.avatar} className="w-7 h-7 text-xs" />
              <span className="text-white text-sm max-w-[120px] truncate hidden xl:inline">{user.name || user.email}</span>
              <StatusBadge level={user.level} compact />
              <TierBadge tier={user.tier} compact />
              <SupporterBadge no={user.supporter} creator={user.creator} compact />
              <FounderBadge no={user.founder} compact />
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setAuthOpen(true)} className="h-8 px-2 text-[13px] text-muted-foreground hover:text-white hover:bg-hover">
              <Icon name="UserRound" size={14} className="mr-1.5" />
              Войти
            </Button>
          )}
          <Button
            onClick={() => navigate("/plans")}
            className="ml-1 h-8 px-2.5 text-[13px] font-semibold bg-rose-500/20 text-rose-200 border border-rose-400/30 hover:bg-rose-500/30 hover:text-rose-100"
          >
            <Icon name="Crown" size={14} className="mr-1.5" />
            Подписка
          </Button>
          <DonateButton className="ml-1" />
          <Button
            className="ml-1 h-8 px-2.5 text-[13px] font-semibold"
            onClick={() => {
              go("welcome");
              setTimeout(() => document.getElementById("subscribe")?.scrollIntoView({ behavior: "smooth" }), 100);
            }}
          >
            Дайджест
          </Button>
        </div>
        <Button
          variant="ghost"
          className="md:hidden text-muted-foreground hover:text-white hover:bg-hover p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Меню"
        >
          <Icon name={mobileMenuOpen ? "X" : "Menu"} size={20} />
        </Button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-border flex flex-col gap-1 animate-fade-in">
          {CHANNELS.map((c) => (
            <Button key={c.id} variant="ghost" onClick={() => go(c.id)} className="justify-start text-muted-foreground hover:text-white hover:bg-hover">
              <span className={`w-2 h-2 rounded-full mr-2.5 flex-shrink-0 ${c.id === "ainews" ? "bg-white" : "bg-primary"}`} />
              {c.name}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => navigate("/plans")} className="justify-start text-yellow-300 hover:text-yellow-200 hover:bg-hover">
            <Icon name="Crown" size={16} className="mr-2" />
            Подписка: Бронза, Серебро, Золото
          </Button>
          <DonateButton full />
          <Button variant="ghost" asChild className="justify-start text-muted-foreground hover:text-white hover:bg-hover">
            <a href="https://max.ru/join/NlGkb3arf9YBdWjvXf-a5gVYZdEOEYGX6A79q2w7LEg" target="_blank" rel="noreferrer">
              <Icon name="MessageCircle" size={16} className="mr-2" />
              Канал в MAX
            </a>
          </Button>
          <Button
            variant="ghost"
            onClick={() => (user ? navigate("/profile") : setAuthOpen(true))}
            className="justify-start text-muted-foreground hover:text-white hover:bg-hover"
          >
            <Icon name="UserRound" size={16} className="mr-2" />
            {user ? "Личный кабинет" : "Войти"}
          </Button>
        </div>
      )}
    </nav>
  );
};

export default HomeNav;
