import { GoFn } from "./homeConfig";
import UserAvatar from "@/components/crypto/UserAvatar";
import VerifiedBadge from "@/components/crypto/VerifiedBadge";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/lib/auth";
import { fundFmt, useFund } from "@/lib/fund";
import { useNavigate } from "@/lib/router-compat";

interface Props {
  go: GoFn;
}

const HomeNav = ({ go }: Props) => {
  const { user, token, setAuthOpen } = useAuth();
  const { data: fund } = useFund(token);
  const navigate = useNavigate();
  return (
  <nav className="bg-card sticky top-0 z-30 flex items-center justify-between relative">
    <div className="px-4 sm:px-6 py-3">
      <button onClick={() => go("welcome")} className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl sm:text-2xl leading-none">
          Т
        </div>
        <div className="text-left">
          <h1 className="font-display text-lg sm:text-xl text-white leading-none tracking-wide">TRADER<span className="text-primary">KA</span>.RU</h1>
          <p className="text-xs text-muted-foreground hidden sm:block mt-1">Котировки, графики и новости.</p>
        </div>
      </button>
    </div>
    {fund && (
      <button
        onClick={() => go("fund")}
        title="Общий фонд сообщества"
        aria-label={`Фонд: ${fundFmt(fund.total)} TKA`}
        className="absolute left-1/2 -translate-x-1/2 hidden md:inline-flex items-center gap-1.5 rounded-full bg-rail hover:bg-hover transition-colors pl-2 pr-3 py-1 border border-border"
      >
        <Icon name="Landmark" size={14} className="text-primary" />
        <span className="font-mono text-xs text-white leading-none">{fundFmt(fund.total)}</span>
        <span className="text-[9px] font-semibold text-primary leading-none">TKA</span>
      </button>
    )}
    <div className="px-4 sm:px-6 flex-shrink-0 flex items-center gap-2">
      {user && <VerifiedBadge userId={user.id} size={18} />}
      <button
        onClick={() => (user ? navigate("/profile") : setAuthOpen(true))}
        title={user ? "Личный кабинет" : "Войти"}
        aria-label={user ? "Личный кабинет" : "Войти"}
      >
        {user ? (
          <UserAvatar name={user.name} email={user.email} avatar={user.avatar} level={user.level} online dot="md" className="w-11 h-11 text-lg" userId={user.id} />
        ) : (
          <UserAvatar className="w-11 h-11 text-lg" />
        )}
      </button>
    </div>
  </nav>
  );
};

export default HomeNav;