import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL, useAuth } from "@/lib/auth";
import { useNavigate } from "@/lib/router-compat";
import UserAvatar from "@/components/crypto/UserAvatar";
import StatusBadge from "@/components/crypto/StatusBadge";
import FounderBadge from "@/components/crypto/FounderBadge";
import SupporterBadge from "@/components/crypto/SupporterBadge";
import { Achievement, META } from "@/components/crypto/Achievements";
import { SPECIAL_META } from "@/components/crypto/SpecialAchievements";

interface Mini {
  id: string;
  title: string;
  icon: string;
  color: string;
  done: boolean;
}

const ProfileMiniCard = ({ part = "main" }: { part?: "main" | "achievements" }) => {
  const { user, token, logout, setAuthOpen } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["profile-mini", token],
    enabled: !!user && !!token,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = await fetch(PROFILE_URL, { headers: { "X-Auth-Token": token ?? "" } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Ошибка");
      return d.profile as { achievements?: Achievement[]; special?: Achievement[]; founder?: number | null };
    },
  });
  const minis: Mini[] = [
    ...(profile?.achievements ?? []).filter((a) => META[a.id]).map((a) => ({ id: a.id, title: META[a.id].title, icon: META[a.id].icon, color: META[a.id].color, done: a.done })),
    ...(profile?.special ?? []).filter((a) => SPECIAL_META[a.id]).map((a) => ({ id: a.id, title: SPECIAL_META[a.id].title, icon: SPECIAL_META[a.id].icon, color: SPECIAL_META[a.id].color, done: a.done })),
    ...(profile ? [{ id: "founder", title: "Основатель", icon: "Gem", color: "from-amber-200 via-yellow-400 to-amber-600", done: !!profile.founder }] : []),
  ];

  if (part === "achievements") {
    if (!user || minis.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 max-w-[260px] p-2 bg-rail rounded-lg" aria-label="Достижения">
        {minis.map((m) => (
          <span
            key={m.id}
            title={`${m.title}${m.done ? "" : " — ещё не получено"}`}
            className={`w-6 h-6 rounded-full flex items-center justify-center ${
              m.done ? `bg-gradient-to-br ${m.color} text-black` : "bg-card text-muted-foreground/50"
            }`}
          >
            <Icon name={m.icon} size={12} fallback="Award" />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
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
