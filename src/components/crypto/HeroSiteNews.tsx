import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@/lib/router-compat";
import { useSiteNews, type SiteNews } from "@/lib/siteNews";
import SiteNewsDialog from "@/components/crypto/SiteNewsDialog";

const MSK = 3 * 3600_000;

const timeOf = (ts: number) => new Date(ts + MSK).toISOString().slice(11, 16);

const dayOf = (ts: number) => {
  const k = (t: number) => new Date(t + MSK).toISOString().slice(0, 10);
  const d = k(ts);
  if (d === k(Date.now())) return "Сегодня";
  if (d === k(Date.now() - 86400_000)) return "Вчера";
  return new Date(`${d}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const HeroSiteNews = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useSiteNews();
  const [opened, setOpened] = useState<SiteNews | null>(null);
  const items = (data ?? []).slice(0, 5);

  return (
    <div className="p-3 sm:p-4 flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Icon name="Megaphone" size={12} className="text-primary" /> Новости сайта
        </div>
        <button onClick={() => navigate("/news")} className="text-xs text-primary hover:underline">
          Все новости →
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 bg-rail" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Скоро здесь появятся новости проекта</p>
      ) : (
        <ul>
          {items.map((n) => {
            const ts = new Date(n.createdAt).getTime();
            const day = dayOf(ts);
            return (
              <li key={n.id}>
                <div
                  onClick={() => setOpened(n)}
                  className="flex items-start gap-3 rounded-lg px-2 py-1 hover:bg-hover/60 transition-colors group cursor-pointer"
                >
                  <div className="w-14 flex-shrink-0 text-center">
                    <div className="font-mono tabular text-white text-sm leading-tight">{timeOf(ts)}</div>
                    <div className={`text-[10px] ${day === "Сегодня" ? "text-primary" : "text-muted-foreground"}`}>{day}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{n.title}</div>
                    {n.body && <div className="mt-1 text-[10px] text-muted-foreground truncate">{n.body.split("\n").find((l) => l.trim())}</div>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <SiteNewsDialog item={opened} onClose={() => setOpened(null)} />
    </div>
  );
};

export default HeroSiteNews;