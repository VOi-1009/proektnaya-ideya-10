import { useAuth } from "@/lib/auth";
import { nameCls } from "@/lib/status";
import { useOnline } from "@/lib/users";
import { useOpenMember } from "@/lib/memberCard";
import MemberIcon from "./MemberIcon";
import BotBadge from "./BotBadge";

const OnlineMarquee = () => {
  const { user, token } = useAuth();
  const { data } = useOnline(token);
  const openMember = useOpenMember();
  const list = data?.online ?? [];
  if (!list.length) return null;

  const base = list.length < 6 ? Array.from({ length: Math.ceil(6 / list.length) }, () => list).flat() : list;
  const row = [...base, ...base];
  const duration = Math.max(20, base.length * 4);

  return (
    <div className="relative overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]" style={{ animationDuration: `${duration}s` }}>
        {row.map((u, i) => {
          return (
            <button
              key={`${u.id}-${i}`}
              onClick={() => openMember(u.id)}
              className="flex items-center gap-2 px-3 py-1 rounded-full hover:bg-hover/60 transition-colors flex-shrink-0"
              title="Открыть карточку участника"
            >
              <span className="relative">
                <MemberIcon name={u.name} level={u.level} avatar={u.avatar} online dot="sm" />
              </span>
              <span className={`text-sm whitespace-nowrap ${nameCls(u.level, "text-foreground")}`}>
                {u.name}
                {user?.id === u.id && <span className="text-muted-foreground font-normal"> (вы)</span>}
              </span>
              {u.isAi && <BotBadge ai compact />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OnlineMarquee;
