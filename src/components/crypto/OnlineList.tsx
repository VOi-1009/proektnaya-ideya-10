import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { levelInfo } from "@/lib/status";
import { useOnline } from "@/lib/users";

const OnlineList = () => {
  const { user, token } = useAuth();
  const { data, isLoading } = useOnline(token);
  const list = data?.online ?? [];

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
              <li key={u.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-hover/60">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 ${l.cls}`} title={l.title}>
                  <Icon name={l.icon} size={11} />
                </span>
                <span className={`text-sm truncate flex-1 ${u.level === 6 ? "text-amber-300 font-semibold" : "text-foreground"}`}>
                  {u.name}
                  {me && <span className="text-muted-foreground font-normal"> (вы)</span>}
                </span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{l.title}</span>
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
