import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { usersRequest } from "@/lib/users";

interface Row {
  place: number;
  points: number;
}

interface Props {
  token: string | null;
  streak: number;
  bestStreak: number;
  days: number;
}

const ProfileSummary = ({ token, streak, bestStreak, days }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["rating", token],
    queryFn: () => usersRequest<{ top: Row[]; me: Row | null; total: number }>(token, "&rating=1"),
    enabled: !!token,
    staleTime: 60_000,
  });
  const me = data?.me;

  const cells = [
    { icon: "Trophy", label: "Место в рейтинге", value: me ? `${me.place}${data ? ` из ${data.total}` : ""}` : "—" },
    { icon: "Flame", label: "Дней подряд", value: String(streak) },
    { icon: "Medal", label: "Лучшая серия", value: String(Math.max(bestStreak, streak)) },
    { icon: "CalendarCheck", label: "Всего дней на сайте", value: String(days) },
  ];

  return (
    <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="LayoutDashboard" size={16} className="text-primary" />
        <span className="text-white font-semibold text-sm">Сводка</span>
        <Link to="/rating" className="ml-auto text-xs text-primary hover:underline">Рейтинг →</Link>
      </div>
      {isLoading ? (
        <Skeleton className="h-24 w-full bg-rail" />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {cells.map((c) => (
            <div key={c.label} className="rounded-lg bg-rail/50 px-2.5 py-2 min-w-0">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <Icon name={c.icon} size={11} className="text-primary flex-shrink-0" /> {c.label}
              </div>
              <div className="font-mono text-white text-sm truncate">{c.value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProfileSummary;
