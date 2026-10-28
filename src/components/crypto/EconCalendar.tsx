import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarEvent, useEconCalendar } from "@/lib/econCalendar";

const dayTitle = (day: string) => {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
};

const todayKey = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

const EconCalendar = () => {
  const { data, isLoading, isError } = useEconCalendar();
  const today = todayKey();

  const groups = (data ?? []).reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    (acc[e.day] ||= []).push(e);
    return acc;
  }, {});
  const days = Object.keys(groups).sort();

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
      <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center gap-2">
        <Icon name="CalendarClock" size={16} className="text-primary" />
        <h2 className="text-white font-semibold text-sm">Экономический календарь</h2>
        <span className="text-muted-foreground text-xs">только важные события, время МСК</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full bg-card" />
      ) : isError ? (
        <p className="text-muted-foreground text-sm p-4">Календарь временно недоступен. Попробуйте позже.</p>
      ) : !days.length ? (
        <p className="text-muted-foreground text-sm p-4">На этой неделе важных событий нет.</p>
      ) : (
        <div className="divide-y divide-border/60">
          {days.map((day) => (
            <div key={day}>
              <div className={`px-3 sm:px-4 py-1.5 text-[11px] uppercase tracking-wider font-semibold bg-rail/40 ${day === today ? "text-primary" : "text-muted-foreground"}`}>
                {day === today ? "Сегодня · " : ""}
                {dayTitle(day)}
              </div>
              {groups[day].map((e, i) => (
                <div key={`${e.ts}-${i}`} className="px-3 sm:px-4 py-2 flex items-start gap-3 text-sm">
                  <span className="font-mono tabular text-white/90 w-12 flex-shrink-0">{e.time}</span>
                  <span className="text-[10px] font-mono text-primary border border-primary/40 rounded px-1 py-0.5 flex-shrink-0 mt-0.5">{e.currency}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground leading-snug">{e.title}</div>
                    <div className="text-muted-foreground text-[11px]">{e.country}</div>
                  </div>
                  {(e.forecast || e.previous) && (
                    <div className="text-right text-[11px] font-mono tabular text-muted-foreground flex-shrink-0">
                      {e.forecast && <div>прогноз <span className="text-white">{e.forecast}</span></div>}
                      {e.previous && <div>было <span className="text-white/80">{e.previous}</span></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default EconCalendar;
