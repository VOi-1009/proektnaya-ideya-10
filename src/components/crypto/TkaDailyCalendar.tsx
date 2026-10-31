import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useDaily } from "@/lib/tka";
import TkaIcon from "./TkaIcon";

const TkaDailyCalendar = ({ token }: { token: string | null }) => {
  const { data, isLoading } = useDaily(token);

  return (
    <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="CalendarCheck" size={16} className="text-primary" />
        <span className="text-white font-semibold text-sm">Ежедневный бонус TKA</span>
        {data && data.streak > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <Icon name="Flame" size={12} className="text-primary" /> {data.streak} дн. подряд
          </span>
        )}
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-24 w-full bg-rail" />
      ) : (
        (() => {
          const last = data.rewards.length;
          const today = Math.min(data.nextDay, last);
          const doneUpTo = data.claimed ? today : today - 1;
          const tomorrow = Math.min(data.nextDay + (data.claimed ? 1 : 1), last);
          const sameTomorrow = tomorrow === today;
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-1.5">
                {data.rewards.map((rw, i) => {
                  const day = i + 1;
                  const done = day <= doneUpTo;
                  const isToday = !data.claimed && day === today;
                  const isTomorrow = !sameTomorrow && day === tomorrow;
                  return (
                    <div
                      key={day}
                      className={`relative rounded-lg border p-1.5 flex flex-col items-center text-center ${
                        done
                          ? "border-[#22C55E]/50 bg-[#22C55E]/10"
                          : isToday
                            ? "border-primary bg-primary/15 shadow-[0_0_10px_hsl(var(--primary)/0.45)]"
                            : isTomorrow
                              ? "border-dashed border-accent/70 bg-accent/5"
                              : "border-border"
                      }`}
                    >
                      <span className="text-[9px] text-muted-foreground leading-none mb-1">день {day}</span>
                      <div className="h-5 flex items-center justify-center">
                        {done ? <Icon name="Check" size={16} className="text-[#22C55E]" /> : <TkaIcon size={16} className={isToday || isTomorrow ? "" : "opacity-50"} />}
                      </div>
                      <span className={`font-mono text-xs mt-1 ${done ? "text-[#22C55E]" : "text-white"}`}>+{rw}</span>
                      {isToday && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase bg-primary text-primary-foreground rounded px-1">сегодня</span>}
                      {isTomorrow && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase bg-accent text-accent-foreground rounded px-1">завтра</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.claimed
                  ? sameTomorrow
                    ? `Бонус на сегодня получен. Завтра снова +${data.rewards[last - 1]} TKA: максимальная награда держится, пока вы заходите каждый день.`
                    : `Бонус на сегодня получен. Завтра ждёт +${data.tomorrow} TKA, если зайдёте.`
                  : `Заберите бонус кнопкой в шапке сайта: сегодня +${data.reward} TKA. Пропустите день, и серия начнётся заново.`}
              </p>
            </div>
          );
        })()
      )}
    </section>
  );
};

export default TkaDailyCalendar;
