import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@/lib/router-compat";
import UserAvatar from "@/components/crypto/UserAvatar";
import StatusBadge from "@/components/crypto/StatusBadge";
import FounderBadge from "@/components/crypto/FounderBadge";
import SupporterBadge from "@/components/crypto/SupporterBadge";

const ProfileMiniCard = () => {
  const { user, logout, setAuthOpen } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 min-w-0">
      <button
        onClick={() => (user ? navigate("/profile") : setAuthOpen(true))}
        className="relative"
        title={user ? "Личный кабинет" : "Войти"}
      >
        {user ? (
          <UserAvatar name={user.name} email={user.email} avatar={user.avatar} level={user.level} online dot="md" />
        ) : (
          <UserAvatar />
        )}
      </button>
      <button
        onClick={() => (user ? navigate("/profile") : setAuthOpen(true))}
        className="min-w-0 text-left"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-white text-sm font-medium truncate">{user ? user.name || user.email : "Гость"}</span>
          {user && <StatusBadge level={user.level} compact />}
          {user && <SupporterBadge no={user.supporter} creator={user.creator} compact />}
          {user && <FounderBadge no={user.founder} compact />}
        </div>
        <div className="text-muted-foreground text-xs truncate hover:text-primary">
          {user ? "Личный кабинет →" : "Войдите в аккаунт"}
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
  );
};

export default ProfileMiniCard;
