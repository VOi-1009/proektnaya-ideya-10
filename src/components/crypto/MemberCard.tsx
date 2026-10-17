import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { COIN_META } from "@/lib/crypto";
import { useAuth } from "@/lib/auth";
import { nameCls } from "@/lib/status";
import { usersRequest } from "@/lib/users";
import { Achievement } from "./Achievements";
import MemberIcon from "./MemberIcon";
import SpecialAchievements from "./SpecialAchievements";
import StatusBadge from "./StatusBadge";

interface Member {
  id: number;
  name: string;
  avatar: string;
  level: number;
  title: string;
  points: number;
  city: string;
  bio: string;
  favoriteCoin: string;
  createdAt: string;
  online: boolean;
  place: number;
  special: Achievement[];
}

const MemberCard = ({ id, onClose }: { id: number | null; onClose: () => void }) => {
  const { token, user } = useAuth();
  const { data: m, isLoading, isError } = useQuery({
    queryKey: ["member", id],
    enabled: id !== null,
    queryFn: () => usersRequest<{ member: Member }>(token, `&card=${id}`).then((d) => d.member),
    staleTime: 60_000,
  });

  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="h-20 bg-gradient-to-br from-primary/30 via-accent/10 to-transparent" />
        <div className="px-5 pb-5 -mt-12">
          {isLoading || !m ? (
            isError ? (
              <div className="pt-14 text-sm text-down">
                <DialogTitle className="sr-only">Участник</DialogTitle>
                Не удалось загрузить карточку участника.
              </div>
            ) : (
              <div className="space-y-3">
                <DialogTitle className="sr-only">Загрузка</DialogTitle>
                <Skeleton className="w-20 h-20 rounded-full bg-hover" />
                <Skeleton className="h-6 w-40 bg-hover" />
                <Skeleton className="h-24 w-full bg-hover" />
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="relative">
                  <MemberIcon
                    name={m.name}
                    level={m.level}
                    avatar={m.avatar}
                    className="w-20 h-20 text-3xl ring-4 ring-card"
                    iconSize={34}
                  />
                  {m.online && (
                    <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 ring-2 ring-card" title="В сети" />
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <DialogTitle className={`text-xl truncate ${nameCls(m.level)}`}>
                    {m.name}
                    {user?.id === m.id && <span className="text-muted-foreground font-normal text-sm"> (вы)</span>}
                  </DialogTitle>
                  <DialogDescription asChild>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge level={m.level} compact />
                      <span className={`text-xs ${m.online ? "text-green-400" : "text-muted-foreground"}`}>
                        {m.online ? "в сети" : "не в сети"}
                      </span>
                    </div>
                  </DialogDescription>
                </div>
              </div>

              {m.bio && <p className="text-sm text-foreground bg-rail/60 rounded-lg px-3 py-2">{m.bio}</p>}

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-rail/60 rounded-lg px-3 py-2">
                  <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                    <Icon name="Zap" size={11} /> Очки
                  </div>
                  <div className="text-white font-mono tabular">{m.points.toLocaleString("ru-RU")}</div>
                </div>
                <div className="bg-rail/60 rounded-lg px-3 py-2">
                  <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                    <Icon name="Trophy" size={11} /> Рейтинг
                  </div>
                  <div className="text-white font-mono tabular">#{m.place}</div>
                </div>
                <div className="bg-rail/60 rounded-lg px-3 py-2 min-w-0">
                  <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                    <Icon name="MapPin" size={11} /> Город
                  </div>
                  <div className="text-white truncate">{m.city || "—"}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Icon name="CalendarDays" size={12} />
                  на сайте с {new Date(m.createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                </span>
                {m.favoriteCoin && (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="Heart" size={12} /> {COIN_META[m.favoriteCoin]?.ru ?? m.favoriteCoin}
                  </span>
                )}
              </div>

              <SpecialAchievements items={m.special} compact />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberCard;
