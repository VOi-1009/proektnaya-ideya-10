import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/crypto/UserAvatar";
import StatusBadge from "@/components/crypto/StatusBadge";
import FounderBadge from "@/components/crypto/FounderBadge";
import SupporterBadge from "@/components/crypto/SupporterBadge";

interface Props {
  favsCount: number;
}

const ProfileMiniCard = ({ favsCount }: Props) => {
  const { user, logout, setAuthOpen } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-2 bg-rail rounded-lg flex items-center gap-2">
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
  );
};

export default ProfileMiniCard;
