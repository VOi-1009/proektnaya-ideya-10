import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopNews } from "@/lib/reactions";

const MSK = 3 * 3600_000;

const timeOf = (ts: number | null) => (ts ? new Date(ts + MSK).toISOString().slice(11, 16) : "");

const dayOf = (ts: number | null) => {
  if (!ts) return "";
  const k = (t: number) => new Date(t + MSK).toISOString().slice(0, 10);
  const d = k(ts);
  if (d === k(Date.now())) return "Сегодня";
  if (d === k(Date.now() - 86400_000)) return "Вчера";
  return new Date(`${d}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const TopNewsBlock = ({ onAll }: { onAll: () => void }) => {
  const { data, isLoading } = useTopNews();

  return (
    <div className="p-3 sm:p-4 flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Icon name="Flame" size={12} className="text-primary" /> Обсуждаемые новости
        </div>
        <button onClick={onAll} className="text-xs text-primary hover:underline">
          Все новости →
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 bg-rail" />
          ))}
        </div>
      ) : data?.length ? (
        <ul className="space-y-1">
          {data.map((n) => (
            <li key={n.id}>
              <a
                href={n.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-hover/60 transition-colors group"
              >
                <div className="w-14 flex-shrink-0 text-center">
                  <div className="font-mono tabular text-white text-sm leading-tight">{timeOf(n.ts)}</div>
                  <div className={`text-[10px] ${dayOf(n.ts) === "Сегодня" ? "text-primary" : "text-muted-foreground"}`}>{dayOf(n.ts)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{n.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{n.source}</span>
                    <span className="inline-flex items-center gap-1 text-up font-mono">
                      <Icon name="ThumbsUp" size={11} /> {n.likes}
                    </span>
                    <span className="inline-flex items-center gap-1 text-down font-mono">
                      <Icon name="ThumbsDown" size={11} /> {n.dislikes}
                    </span>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <Icon name="MessagesSquare" size={28} className="text-muted-foreground mb-2" />
          <div className="text-white text-sm font-medium">Пока никто не оценивал новости</div>
          <div className="text-muted-foreground text-xs mt-1 mb-3">Ставьте лайки и дизлайки — здесь появятся самые обсуждаемые</div>
          <button onClick={onAll} className="text-xs text-primary hover:underline">
            Перейти к новостям →
          </button>
        </div>
      )}
    </div>
  );
};

export default TopNewsBlock;
