import Icon from "@/components/ui/icon";
import { useSiteNews } from "@/lib/siteNews";

const SiteNewsBlock = () => {
  const { data } = useSiteNews();
  if (!data || data.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        <Icon name="ChevronDown" size={12} />
        <span>Новости сайта</span>
      </div>
      <div className="mt-0.5 space-y-1.5 px-1">
        {data.map((n) => (
          <div key={n.id} className="rounded-lg bg-rail/60 px-3 py-2">
            <div className="text-sky-400 text-sm font-semibold leading-snug">{n.title}</div>
            {n.body && <p className="text-muted-foreground text-xs mt-1 leading-relaxed whitespace-pre-line">{n.body}</p>}
            <div className="text-muted-foreground/70 text-[9px] font-mono mt-1.5">
              {new Date(n.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SiteNewsBlock;
