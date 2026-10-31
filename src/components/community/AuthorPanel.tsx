import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/router-compat";
import { statusColor, nameCls } from "@/lib/status";
import { experienceLabel } from "@/lib/contacts";
import MemberIcon from "@/components/crypto/MemberIcon";
import StatusBadge from "@/components/crypto/StatusBadge";
import FounderBadge from "@/components/crypto/FounderBadge";
import SupporterBadge from "@/components/crypto/SupporterBadge";
import TeamBadge from "@/components/crypto/TeamBadge";
import ContactLinks from "@/components/crypto/ContactLinks";
import { AuthorProfile, MOODS } from "@/lib/community";

interface Props {
  author?: AuthorProfile;
  loading: boolean;
  loggedIn: boolean;
  filterOn: boolean;
  onFilter: () => void;
  onFollow: () => void;
  onCard: () => void;
  onLogin: () => void;
}

const Stat = ({ icon, value, label }: { icon: string; value: number | string; label: string }) => (
  <div className="bg-rail/60 rounded-lg px-2 py-2 text-center min-w-0">
    <div className="text-white font-mono tabular text-sm leading-tight">{value}</div>
    <div className="text-muted-foreground text-[10px] flex items-center justify-center gap-1 mt-0.5 truncate">
      <Icon name={icon} size={10} /> {label}
    </div>
  </div>
);

const AuthorPanel = ({ author: a, loading, loggedIn, filterOn, onFilter, onFollow, onCard, onLogin }: Props) => (
  <aside className="w-full lg:w-72 flex-shrink-0 bg-card/60 border-y lg:border-y-0 lg:border-x border-border/60">
    <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      {loading ? (
        <div className="p-4 space-y-3">
          <Skeleton className="h-16 w-full bg-hover" />
          <Skeleton className="h-5 w-32 bg-hover" />
          <Skeleton className="h-20 w-full bg-hover" />
        </div>
      ) : !a ? (
        <div className="p-5 text-center space-y-3">
          <Icon name="UserRound" size={32} className="mx-auto text-primary" />
          <div className="text-white font-semibold text-sm">Страница автора</div>
          <p className="text-muted-foreground text-xs">Нажмите на имя автора в ленте, чтобы увидеть его страницу.</p>
          {!loggedIn && (
            <Button onClick={onLogin} size="sm" className="rounded-full font-semibold">
              Войти
            </Button>
          )}
        </div>
      ) : (
        <div className="pb-4">
          <div className="h-14" style={{ background: `linear-gradient(90deg, ${statusColor(a.level)}55, ${statusColor(a.level)}15)` }} />
          <div className="px-4 -mt-8">
            <MemberIcon name={a.name} level={a.level} avatar={a.avatar} online={a.online} dot="md" className="w-16 h-16 text-2xl" iconSize={28} />
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <h2 className={`font-display text-lg leading-tight truncate max-w-full ${nameCls(a.level)}`}>{a.name}</h2>
              {a.isMe && <span className="text-[10px] text-primary">это вы</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <StatusBadge level={a.level} compact />
              <TeamBadge team={a.team} compact />
              <SupporterBadge no={a.supporter} creator={a.creator} compact />
              <FounderBadge no={a.founder} compact />
              <span className={`text-[11px] ${a.online ? "text-white" : "text-muted-foreground"}`}>{a.online ? "в сети" : "не в сети"}</span>
            </div>
            {a.headline && <p className="text-sm text-white mt-2">{a.headline}</p>}

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {a.city && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="MapPin" size={11} /> {a.city}
                </span>
              )}
              {a.experience && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="Briefcase" size={11} /> {experienceLabel(a.experience)}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Icon name="CalendarDays" size={11} /> с {new Date(a.createdAt).toLocaleDateString("ru-RU", { month: "short", year: "numeric" })}
              </span>
            </div>

            {a.bio && <p className="text-xs text-foreground mt-3 line-clamp-5 whitespace-pre-line">{a.bio}</p>}
            {a.interests && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Интересы: <span className="text-white">{a.interests}</span>
              </p>
            )}

            <div className="grid grid-cols-3 gap-1.5 mt-4">
              <Stat icon="FileText" value={a.posts} label="постов" />
              <Stat icon="Users" value={a.followers} label="читают" />
              <Stat icon="UserCheck" value={a.following} label="читает" />
              <Stat icon="Trophy" value={`#${a.place}`} label="рейтинг" />
              <Stat icon="Zap" value={a.points.toLocaleString("ru-RU")} label="очков" />
              <Stat icon="Smile" value={a.reactions} label="реакций" />
            </div>

            {(a.bulls > 0 || a.bears > 0) && (
              <div className="flex gap-2 mt-3">
                {(["bull", "bear"] as const).map((k) => {
                  const n = k === "bull" ? a.bulls : a.bears;
                  return (
                    <span key={k} className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 font-semibold ${MOODS[k].cls}`}>
                      <Icon name={MOODS[k].icon} size={11} /> {n}
                    </span>
                  );
                })}
                <span className="text-[10px] text-muted-foreground self-center">настрой в постах</span>
              </div>
            )}

            {Object.keys(a.contacts).length > 0 && <ContactLinks contacts={a.contacts} compact className="mt-3" />}
            {a.contactsHidden && (
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
                <Icon name="Lock" size={11} /> Контакты видны вошедшим
              </p>
            )}

            <div className="mt-4 space-y-2">
              {a.isMe ? (
                <Button asChild variant="outline" size="sm" className="w-full rounded-full bg-transparent border-input text-foreground hover:bg-hover hover:text-white">
                  <Link to="/profile">
                    <Icon name="Settings" size={14} className="mr-2" /> Редактировать профиль
                  </Link>
                </Button>
              ) : loggedIn ? (
                <Button
                  onClick={onFollow}
                  size="sm"
                  variant={a.isFollowing ? "outline" : "default"}
                  className={`w-full rounded-full font-semibold ${a.isFollowing ? "bg-transparent border-input text-foreground hover:bg-hover hover:text-white" : ""}`}
                >
                  <Icon name={a.isFollowing ? "UserCheck" : "UserPlus"} size={14} className="mr-2" />
                  {a.isFollowing ? "Вы подписаны" : "Подписаться"}
                </Button>
              ) : (
                <Button onClick={onLogin} size="sm" className="w-full rounded-full font-semibold">
                  Войти, чтобы подписаться
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={onFilter}
                  size="sm"
                  variant="outline"
                  className={`rounded-full bg-transparent hover:bg-hover hover:text-white text-xs ${filterOn ? "border-primary text-white" : "border-input text-foreground"}`}
                >
                  <Icon name="ListFilter" size={13} className="mr-1.5" /> {filterOn ? "Все посты" : "Его посты"}
                </Button>
                <Button onClick={onCard} size="sm" variant="outline" className="rounded-full bg-transparent border-input text-foreground hover:bg-hover hover:text-white text-xs">
                  <Icon name="IdCard" size={13} className="mr-1.5" /> Карточка
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </aside>
);

export default AuthorPanel;
