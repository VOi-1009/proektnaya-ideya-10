import Icon from "@/components/ui/icon";
import { useSiteNews } from "@/lib/siteNews";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

const HeroSiteNews = () => {
  const { data, isLoading } = useSiteNews();
  const items = (data ?? []).slice(0, 6);

  return (
    <div className="p-4 sm:p-5 h-full flex flex-col">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
        <Icon name="Megaphone" size={12} className="text-sky-400" /> Новости сайта
      </div>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Загружаю…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Скоро здесь появятся новости проекта.</p>
      ) : (
        <ul className="space-y-3 flex-1">
          {items.map((n, i) => (
            <li key={n.id} className={i > 0 ? "pt-3 border-t border-border/60" : ""}>
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground/70 text-[10px] font-mono flex-shrink-0">{fmt(n.createdAt)}</span>
                <span className="text-sky-400 text-sm font-semibold leading-snug">{n.title}</span>
              </div>
              {n.body && <p className="text-muted-foreground text-xs mt-1 leading-relaxed line-clamp-2 whitespace-pre-line">{n.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HeroSiteNews;
