import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { nameCls } from "@/lib/status";
import StatusBadge from "@/components/crypto/StatusBadge";
import FounderBadge from "@/components/crypto/FounderBadge";
import SupporterBadge from "@/components/crypto/SupporterBadge";
import MemberIcon from "@/components/crypto/MemberIcon";
import { useOpenMember } from "@/lib/memberCard";
import { useAuth } from "@/lib/auth";
import { usersRequest } from "@/lib/users";

interface RatingRow {
  id: number;
  name: string;
  points: number;
  level: number;
  title: string;
  city: string;
  place: number;
  avatar?: string;
  founder?: number | null;
  supporter?: number | null;
  creator?: boolean;
}

const MEDALS: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-300 to-amber-500 text-black",
  2: "bg-gradient-to-br from-slate-200 to-slate-400 text-black",
  3: "bg-gradient-to-br from-orange-300 to-orange-600 text-black",
};

const Place = ({ n }: { n: number }) => (
  <span
    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm flex-shrink-0 ${
      MEDALS[n] ?? "bg-rail text-muted-foreground"
    }`}
  >
    {n}
  </span>
);

const Row = ({ r, me }: { r: RatingRow; me: boolean }) => {
  const openMember = useOpenMember();
  return (
    <div
      onClick={() => openMember(r.id)}
      title="Открыть карточку участника"
      className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-border last:border-0 cursor-pointer hover:bg-hover/40 transition-colors ${
        me ? "bg-primary/10" : r.place <= 3 ? "bg-white/[0.02]" : ""
      }`}
    >
      <Place n={r.place} />
      <MemberIcon
        name={r.name}
        level={r.level}
        avatar={r.avatar}
        className="w-9 h-9 text-sm"
        iconSize={16}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span
            className={`text-sm font-medium truncate hover:underline ${nameCls(r.level)}`}
          >
            {r.name}
          </span>
          {me && <span className="text-xs text-primary">вы</span>}
        </div>
        {r.city && (
          <div className="text-muted-foreground text-xs truncate">{r.city}</div>
        )}
      </div>
      <SupporterBadge no={r.supporter} creator={r.creator} compact className="hidden sm:inline-flex" />
      <FounderBadge no={r.founder} compact className="hidden sm:inline-flex" />
      <StatusBadge level={r.level} compact className="hidden sm:inline-flex" />
      <div className="text-right w-20 flex-shrink-0">
        <div className="text-white font-mono tabular text-sm">
          {r.points.toLocaleString("ru-RU")}
        </div>
        <div className="text-muted-foreground text-[9px]">очков</div>
      </div>
    </div>
  );
};

const Rating = () => {
  const { user, token, setAuthOpen } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["rating", token],
    queryFn: () =>
      usersRequest<{ top: RatingRow[]; me: RatingRow | null; total: number }>(
        token,
        "&rating=1",
      ),
    staleTime: 60_000,
  });
  const meInTop = data?.me && data.top.some((r) => r.id === data.me!.id);

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl sm:text-2xl leading-none">
            Т
          </div>
          <span className="font-display text-lg sm:text-xl text-white tracking-wide hidden sm:inline">
            TRADERKA<span className="text-primary">.RU</span>
          </span>
        </Link>
        <Button
          variant="ghost"
          asChild
          className="text-muted-foreground hover:text-white hover:bg-hover"
        >
          <Link to="/">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            На сайт
          </Link>
        </Button>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <Icon name="Trophy" size={26} />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-white">
              Рейтинг
            </h1>
            <p className="text-muted-foreground text-sm">
              Топ-50 участников по очкам активности
              {data ? ` · всего участников: ${data.total}` : ""}
            </p>
          </div>
        </div>

        {data?.me && (
          <div className="bg-gradient-to-br from-primary/15 to-card border border-primary/30 rounded-xl p-4 flex items-center gap-4">
            <Place n={data.me.place} />
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold">
                Ваше место — {data.me.place}
              </div>
              <div className="text-muted-foreground text-sm">
                {data.me.points.toLocaleString("ru-RU")} очков · статус «
                {data.me.title}»
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="bg-transparent border-input text-foreground hover:bg-hover hover:text-white"
            >
              <Link to="/profile">Как поднять</Link>
            </Button>
          </div>
        )}
        {!user && (
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Войдите, чтобы попасть в рейтинг и увидеть своё место.
            </span>
            <Button
              size="sm"
              onClick={() => setAuthOpen(true)}
              className="font-semibold"
            >
              Войти
            </Button>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Участник</span>
            <span className="hidden sm:inline">Статус</span>
            <span className="w-20 text-right">Очки</span>
          </div>
          {isLoading &&
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="px-4 py-3 border-b border-border">
                <Skeleton className="h-6 bg-hover" />
              </div>
            ))}
          {isError && (
            <div className="p-6 text-center">
              <div className="text-white mb-3">
                Не удалось загрузить рейтинг
              </div>
              <Button size="sm" onClick={() => refetch()}>
                Попробовать снова
              </Button>
            </div>
          )}
          {data?.top.map((r) => (
            <Row key={r.id} r={r} me={user?.id === r.id} />
          ))}
          {data && !meInTop && data.me && (
            <>
              <div className="text-center text-muted-foreground text-xs py-1 border-b border-border">
                ···
              </div>
              <Row r={data.me} me />
            </>
          )}
          {data && !data.top.length && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Пока никого нет.
            </div>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          Очки начисляются за активность: +10 за каждый день на сайте, +5 за
          монету в портфеле (до 20), +6 за каждое заполненное поле профиля.
        </p>
      </main>
    </div>
  );
};

export default Rating;
