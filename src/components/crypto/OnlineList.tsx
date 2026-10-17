import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { levelInfo, nameCls } from "@/lib/status";
import { useOnline } from "@/lib/users";
import MemberIcon from "./MemberIcon";
import { useOpenMember } from "@/lib/memberCard";

const OnlineList = () => {
  const { user, token } = useAuth();
  const { data, isLoading } = useOnline(token);
  const list = data?.online ?? [];
  const openMember = useOpenMember();

  return (
    <div>
      <h3 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-up animate-pulse" /> В сети — {data?.total ?? 0}
      </h3>
      {isLoading ? (
        <div className="space-y-1.5 px-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 bg-hover" />
          ))}
        </div>
      ) : list.length ? (
        <ul className="space-y-0.5">
          {list.map((u) => {
            const l = levelInfo(u.level);
            const me = user?.id === u.id;
            return (
              <li
                key={u.id}
                onClick={() => openMember(u.id)}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-hover/60 cursor-pointer"
                title="Открыть карточку участника"
              >
                <MemberIcon name={u.name} level={u.level} avatar={u.avatar} />
                <span className={`text-sm truncate flex-1 ${nameCls(u.level, "text-foreground")}`}>
                  {u.name}
                  {me && <span className="text-muted-foreground font-normal"> (вы)</span>}
                </span>
                <span className={`text-[10px] flex-shrink-0 ${l.text}`}>{l.title}</span>
              </li>
            );
          })}
          {(data?.total ?? 0) > list.length && (
            <li className="text-xs text-muted-foreground px-2 pt-1">и ещё {(data?.total ?? 0) - list.length}</li>
          )}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground px-2">Сейчас никого нет — заходите в аккаунт, чтобы появиться здесь.</p>
      )}
    </div>
  );
};

export default OnlineList;
