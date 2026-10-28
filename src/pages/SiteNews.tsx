import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { useSiteNews } from "@/lib/siteNews";

const SiteNews = () => {
  const { data, isLoading } = useSiteNews();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <Link to="/" className="text-muted-foreground hover:text-white text-sm inline-flex items-center gap-1.5 mb-6">
          <Icon name="ArrowLeft" size={15} /> На главную
        </Link>
        <div className="flex items-center gap-2 mb-8">
          <Icon name="Megaphone" size={24} className="text-sky-400" />
          <h1 className="font-display text-3xl sm:text-4xl text-white">Новости сайта</h1>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Загружаю…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">Новостей пока нет.</p>
        ) : (
          <div className="space-y-4">
            {data.map((n) => (
              <article key={n.id} className="bg-card border border-border rounded-xl p-5 sm:p-6">
                <h2 className="text-white font-semibold text-lg sm:text-xl mb-2">{n.title}</h2>
                {n.body && <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-line mb-3">{n.body}</p>}
                <div className="text-muted-foreground text-xs font-mono">
                  {new Date(n.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteNews;
