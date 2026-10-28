import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@/lib/router-compat";
import DonateButton from "@/components/crypto/DonateButton";
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
            <p className="text-xs text-muted-foreground hidden sm:block mt-1">Котировки, графики и новости.</p>
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