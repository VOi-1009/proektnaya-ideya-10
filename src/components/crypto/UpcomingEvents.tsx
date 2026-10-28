import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useEconCalendar } from "@/lib/econCalendar";

const dayLabel = (day: string, today: string) => {
  if (day === today) return "Сегодня";
  return new Date(`${day}T12:00:00`).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
};

const UpcomingEvents = ({ onAll }: { onAll: () => void }) => {
  const { data, isLoading, isError } = useEconCalendar();
  const now = data ? Date.now() : 0;
  const today = new Date(now + 3 * 3600_000).toISOString().slice(0, 10);
  const items = (data ?? []).filter((e) => e.ts >= now - 3600_000).slice(0, 5);

  return (
    <div className="p-3 sm:p-4 flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Icon name="CalendarClock" size={12} className="text-primary" /> Экономический календарь
        </div>
        <button onClick={onAll} className="text-xs text-primary hover:underline">
          Весь календарь →
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 bg-rail" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Календарь временно недоступен</p>
      ) : !items.length ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Важных событий до конца недели нет</p>
      ) : (
        <ul className="space-y-1">
          {items.map((e, i) => (
            <li key={`${e.ts}-${i}`} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-hover/60 transition-colors">
              <div className="w-14 flex-shrink-0 text-center">
                <div className="font-mono tabular text-white text-sm leading-tight">{e.time}</div>
                <div className={`text-[10px] ${e.day === today ? "text-primary" : "text-muted-foreground"}`}>{dayLabel(e.day, today)}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm leading-snug line-clamp-2">{e.title}</div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="font-mono text-primary">{e.currency}</span>
                  <span>{e.country}</span>
                  {e.forecast && <span>прогноз {e.forecast}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UpcomingEvents;
