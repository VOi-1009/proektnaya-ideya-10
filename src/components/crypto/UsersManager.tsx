import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { LEVELS } from "@/lib/status";
import { AdminUser, usersRequest } from "@/lib/users";
import StatusBadge from "./StatusBadge";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const ago = (iso: string | null) => {
  if (!iso) return "ещё не заходил";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 5) return "в сети";
  if (m < 60) return `${m} мин назад`;
  if (m < 1440) return `${Math.round(m / 60)} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const UsersManager = ({ token, myId }: { token: string | null; myId?: number }) => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-users", token],
    queryFn: () => usersRequest<{ users: AdminUser[] }>(token, "&admin=1").then((d) => d.users),
  });

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const arr = (data ?? []).filter((u) => !s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    return arr.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  }, [data, q]);

  const setLevel = async (u: AdminUser, value: string) => {
    setBusyId(u.id);
    try {
      const { user } = await usersRequest<{ user: AdminUser }>(token, "", {
        action: "set-status",
        userId: u.id,
        level: value === "auto" ? null : Number(value),
      });
      qc.setQueryData<AdminUser[]>(["admin-users", token], (old) => old?.map((x) => (x.id === u.id ? user : x)));
      qc.invalidateQueries({ queryKey: ["online"] });
      toast({ title: `${user.name}: статус «${user.title}»` });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Пользователи</h1>
        <p className="text-muted-foreground text-sm">
          Всего: {data?.length ?? 0}. «Авто» — статус считается по активности, остальные варианты закрепляют его вручную.
        </p>
      </div>

      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени или почте" />
      </div>

      {isLoading && <Skeleton className="h-40 w-full bg-card" />}
      {isError && <div className="text-down text-sm">Не удалось загрузить пользователей.</div>}

      <div className="space-y-2">
        {list.map((u) => (
          <div key={u.id} className="bg-card border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white text-sm font-medium truncate">{u.name}</span>
                <StatusBadge level={u.level} compact />
                {u.id === myId && <span className="text-xs text-muted-foreground">(вы)</span>}
              </div>
              <div className="text-muted-foreground text-xs flex flex-wrap gap-x-3">
                {u.email && <span className="truncate">{u.email}</span>}
                <span>{u.points} очков</span>
                <span className={ago(u.lastSeen) === "в сети" ? "text-up" : ""}>{ago(u.lastSeen)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {busyId === u.id && <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />}
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
            </div>
          </div>
        ))}
        {data && !list.length && <div className="text-muted-foreground text-sm">Никого не нашлось.</div>}
      </div>
    </div>
  );
};

export default UsersManager;
