import Icon from "@/components/ui/icon";
import { useAuth } from "@/lib/auth";
import { levelInfo, nameCls } from "@/lib/status";
import { useOnline } from "@/lib/users";
import { useOpenMember } from "@/lib/memberCard";
import MemberIcon from "./MemberIcon";
import BotBadge from "./BotBadge";

const OnlineList = () => {
  const { user, token } = useAuth();
  const { data } = useOnline(token);
  const openMember = useOpenMember();
  const list = data?.online ?? [];
  if (!list.length) return null;

  return (
    <div>
      <h3 className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
        <Icon name="Users" size={12} /> Сейчас на сайте
        <span className="ml-auto font-mono text-up">{data?.total ?? list.length}</span>
      </h3>
      <div className="max-h-72 overflow-y-auto space-y-0">
        {list.map((u) => {
          const l = levelInfo(u.level);
          return (
            <button
              key={u.id}
              onClick={() => openMember(u.id)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-hover/60 text-left transition-colors"
              title="Открыть карточку участника"
            >
              <span className="relative flex-shrink-0">
                <MemberIcon name={u.name} level={u.level} avatar={u.avatar} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-up ring-2 ring-card" />
              </span>
              <span className={`text-sm truncate min-w-0 ${nameCls(u.level, "text-foreground")}`}>
                {u.name}
                {user?.id === u.id && <span className="text-muted-foreground font-normal"> (вы)</span>}
              </span>
              <span className="ml-auto flex-shrink-0">
                {u.isAi ? <BotBadge ai compact /> : <span className={`text-[9px] whitespace-nowrap ${l.text}`}>{l.title}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OnlineList;
