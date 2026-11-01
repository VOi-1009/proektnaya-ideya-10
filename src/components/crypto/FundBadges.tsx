import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { fundFmt, useFund } from "@/lib/fund";

const BADGES = [
  { id: "first", title: "Первый взнос", need: 0.01, icon: "Sprout", color: "from-emerald-300 to-green-600" },
  { id: "backer", title: "Вкладчик", need: 1, icon: "PiggyBank", color: "from-sky-300 to-blue-600" },
  { id: "patron", title: "Меценат", need: 10, icon: "HeartHandshake", color: "from-pink-300 to-rose-600" },
  { id: "pillar", title: "Столп фонда", need: 50, icon: "Landmark", color: "from-amber-300 via-yellow-400 to-orange-500" },
];

const FundBadges = ({ token }: { token: string | null }) => {
  const { data, isLoading } = useFund(token);
  const mine = data?.mine ?? 0;
  const next = BADGES.find((b) => mine < b.need);
  const got = BADGES.filter((b) => mine >= b.need).length;

  return (
    <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Landmark" size={16} className="text-primary" />
        <span className="text-white font-semibold text-sm">Фонд</span>
        <span className="ml-auto text-muted-foreground text-xs font-mono">{got} / {BADGES.length}</span>
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-20 w-full bg-rail" />
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Вы внесли в фонд</div>
            <div className="font-display text-2xl text-white leading-none mt-1">
              {fundFmt(mine)} <span className="text-xs text-primary font-semibold">TKA</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BADGES.map((b) => {
              const done = mine >= b.need;
              return (
                <div
                  key={b.id}
                  title={`${b.title}: ${done ? "получено" : `внесите от ${b.need} TKA`}`}
                  className={`rounded-lg p-2 flex flex-col items-center text-center border ${done ? "border-primary/40 bg-primary/5" : "border-border opacity-50"}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${done ? `bg-gradient-to-br ${b.color} text-black shadow` : "bg-rail text-muted-foreground"}`}>
                    <Icon name={done ? b.icon : "Lock"} size={done ? 18 : 14} fallback="Award" />
                  </div>
                  <span className={`text-[9px] leading-tight ${done ? "text-white" : "text-muted-foreground"}`}>{b.title}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {next
              ? `До значка «${next.title}» осталось внести ${fundFmt(next.need - mine)} TKA. В фонд идёт комиссия с ваших обменов.`
              : "Вы получили все значки фонда. Спасибо, что поддерживаете сообщество!"}
          </p>
        </div>
      )}
    </section>
  );
};

export default FundBadges;
