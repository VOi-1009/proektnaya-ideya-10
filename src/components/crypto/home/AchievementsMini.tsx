import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { PROFILE_URL, useAuth } from "@/lib/auth";
import { Achievement, META } from "@/components/crypto/Achievements";
import { SPECIAL_META } from "@/components/crypto/SpecialAchievements";

const ALL_META: Record<string, { title: string; desc: string; icon: string; color: string }> = { ...META, ...SPECIAL_META };

const AchievementsMini = () => {
  const { user, token, logout } = useAuth();
  const { data } = useQuery({
    queryKey: ["home-achievements", token],
    enabled: !!user && !!token,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await fetch(PROFILE_URL, { headers: { "Content-Type": "application/json", "X-Auth-Token": token ?? "" } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Не удалось загрузить достижения");
      const p = d.profile as { achievements?: Achievement[]; special?: Achievement[] };
      return [...(p.achievements ?? []), ...(p.special ?? [])].filter((a) => ALL_META[a.id]);
    },
  });

  if (!user)
    return <p className="text-[10px] text-muted-foreground text-center leading-snug px-2">Достижения показываются только после входа на сайт</p>;

  const done = (data ?? []).filter((a) => a.done).length;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white font-semibold text-sm flex items-center gap-1.5">
          <Icon name="Award" size={14} className="text-primary" /> Достижения
          <span className="text-muted-foreground text-xs font-mono font-normal">
            {done} / {data?.length ?? 0}
          </span>
        </span>
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
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(data ?? []).map((a) => {
          const m = ALL_META[a.id];
          return (
            <div
              key={a.id}
              title={`${m.title} — ${m.desc}${a.done ? "" : ` (${a.progress} из ${a.goal})`}`}
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                a.done ? `bg-gradient-to-br ${m.color} text-black shadow` : "bg-rail text-muted-foreground opacity-60"
              }`}
            >
              <Icon name={a.done ? m.icon : "Lock"} size={a.done ? 14 : 12} fallback="Award" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsMini;
