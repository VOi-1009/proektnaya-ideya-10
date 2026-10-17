import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { LEVELS, nameCls } from "@/lib/status";
import { AdminUser } from "@/lib/users";
import StatusBadge from "./StatusBadge";
import FounderBadge from "./FounderBadge";
import SupporterBadge from "./SupporterBadge";
import MemberIcon from "./MemberIcon";
import BotBadge from "./BotBadge";
import { BotForm, ago, inputCls } from "./usersAdmin";

interface Props {
  u: AdminUser;
  myId?: number;
  busyId: number | null;
  setBot: (b: BotForm) => void;
  setCardId: (id: number) => void;
  setLevel: (u: AdminUser, value: string) => void;
  setToDelete: (u: AdminUser) => void;
}

const UserRow = ({ u, myId, busyId, setBot, setCardId, setLevel, setToDelete }: Props) => {
  const online = u.isBot ? u.online : ago(u.lastSeen) === "в сети";
  return (
    <div className="bg-card border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <button
        onClick={() =>
          u.isBot
            ? setBot({
                id: u.id,
                name: u.name,
                city: u.city,
                level: String(u.level),
                avatar: u.avatar,
              })
            : setCardId(u.id)
        }
        className="flex-1 min-w-0 flex items-center gap-3 text-left group"
        title={u.isBot ? "Открыть карточку бота" : "Открыть карточку пользователя"}
      >
        <MemberIcon name={u.name} level={u.level} avatar={u.avatar} className="w-10 h-10 text-base" iconSize={18} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {u.isAi ? <BotBadge ai compact /> : u.isBot && <Icon name="Bot" size={14} className="text-muted-foreground flex-shrink-0" />}
            <span className={`text-sm font-medium truncate group-hover:underline ${nameCls(u.level)}`}>{u.name}</span>
            <StatusBadge level={u.level} compact />
            <SupporterBadge no={u.supporter} creator={u.creator} compact />
            <FounderBadge no={u.founder} compact />
            {u.id === myId && <span className="text-xs text-muted-foreground">(вы)</span>}
          </div>
          <div className="text-muted-foreground text-xs flex flex-wrap gap-x-3">
            {u.email && <span className="truncate">{u.email}</span>}
            {u.isBot && u.city && <span>{u.city}</span>}
            {!u.isBot && (
              <span>
                {u.points.toLocaleString("ru-RU")} очков
                {u.bonus > 0 && <span className="text-primary"> (+{u.bonus.toLocaleString("ru-RU")} в подарок)</span>}
              </span>
            )}
            <span className={online ? "text-up" : ""}>
              {u.isBot ? (online ? "сейчас в сети" : "сейчас не в сети") : ago(u.lastSeen)}
            </span>
          </div>
        </div>
      </button>
      <div className="flex items-center gap-2">
        {busyId === u.id && <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />}
        {u.isBot ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setBot({
                id: u.id,
                name: u.name,
                city: u.city,
                level: String(u.level),
                avatar: u.avatar,
              })
            }
            className="bg-transparent border-input hover:bg-hover hover:text-white"
          >
            <Icon name="Pencil" size={14} className="mr-1.5" />
            Изменить
          </Button>
        ) : (
          <select
            className={`${inputCls} sm:w-48`}
            disabled={busyId === u.id}
            value={u.manual ? String(u.level) : "auto"}
            onChange={(e) => setLevel(u, e.target.value)}
          >
            <option value="auto">Авто (по активности)</option>
            {LEVELS.map((l, i) => (
              <option key={l.title} value={i + 1}>
                {l.title}
              </option>
            ))}
          </select>
        )}
        {!u.isBot && (
          <button
            onClick={() => setCardId(u.id)}
            className="w-10 h-10 flex-shrink-0 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Подарить очки"
            title="Карточка и очки активности"
          >
            <Icon name="Gift" size={16} />
          </button>
        )}
        {u.id !== myId && !u.isAdmin && (
          <button
            onClick={() => setToDelete(u)}
            disabled={busyId === u.id}
            className="w-10 h-10 flex-shrink-0 rounded flex items-center justify-center text-muted-foreground hover:text-down hover:bg-down/10 transition-colors"
            aria-label="Удалить"
            title="Удалить"
          >
            <Icon name="Trash2" size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default UserRow;
