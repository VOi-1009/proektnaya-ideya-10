import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate, useArticles } from "@/lib/articles";
import HeroSiteNews from "@/components/crypto/HeroSiteNews";

interface Props {
  onOpen: (id: number) => void;
  onAll: () => void;
}

const LatestArticles = ({ onOpen, onAll }: Props) => {
  const { data, isLoading } = useArticles(null, 5);
  if (!isLoading && !data?.length) return null;

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display text-lg sm:text-xl text-white">Свежие статьи</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onAll}
          className="bg-transparent border-input text-foreground hover:bg-hover hover:text-white"
        >
          Все статьи
          <Icon name="ArrowRight" size={14} className="ml-1.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="sm:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <HeroSiteNews />
        </div>
        {isLoading
          ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-56 bg-card" />)
          : data!.slice(2).map((a) => (
              <Link
                key={a.id}
                to={`/articles/${a.id}`}
                className="text-left bg-card border border-border rounded-xl overflow-hidden hover:border-primary/60 transition-colors group"
              >
                {a.cover ? (
                  <img src={a.cover} alt="" loading="lazy" className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-primary/25 to-rail flex items-center justify-center">
                    <Icon name="BookOpen" size={28} className="text-primary/70" />
                  </div>
                )}
                <div className="p-3">
                  <div className="text-muted-foreground text-xs mb-1 flex items-center gap-2">
                    {a.category && <span className="text-primary uppercase tracking-wider">{a.category}</span>}
                    <span>{fmtDate(a.createdAt)}</span>
                  </div>
                  <div className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {a.title}
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
};

export default LatestArticles;