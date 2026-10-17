import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fmtDate, useArticle, useArticles, useCategories } from "@/lib/articles";

const ArticleView = ({ id, onBack }: { id: number; onBack: () => void }) => {
  const { data, isLoading, isError } = useArticle(id);
  return (
    <div className="max-w-3xl animate-fade-in">
      <button onClick={onBack} className="text-muted-foreground hover:text-white text-sm inline-flex items-center gap-1 mb-4">
        <Icon name="ArrowLeft" size={14} /> Все статьи
      </button>
      {isLoading && <Skeleton className="h-80 w-full bg-card" />}
      {isError && <div className="text-down text-sm">Статья не найдена или снята с публикации.</div>}
      {data && (
        <article>
          {data.cover && <img src={data.cover} alt="" className="w-full h-56 sm:h-80 object-cover rounded-xl mb-5" />}
          <h1 className="font-display text-2xl sm:text-3xl text-white leading-tight mb-2">{data.title}</h1>
          <div className="text-muted-foreground text-xs mb-5 flex items-center gap-2 flex-wrap">
            {data.category && <span className="text-primary uppercase tracking-wider">{data.category}</span>}
            <span>
              {data.author} · {fmtDate(data.createdAt)}
            </span>
          </div>
          {data.summary && <p className="text-white/90 text-base sm:text-lg mb-5 leading-relaxed">{data.summary}</p>}
          <div className="text-foreground text-[14px] leading-relaxed whitespace-pre-line break-words">{data.content}</div>
        </article>
      )}
    </div>
  );
};

interface Props {
  openId: number | null;
  setOpenId: (id: number | null) => void;
}

const ArticlesChannel = ({ openId, setOpenId }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<number | null>(null);
  const { data, isLoading, isError, refetch } = useArticles(category);
  const { data: categories } = useCategories();

  if (openId !== null) return <ArticleView id={openId} onBack={() => setOpenId(null)} />;

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm transition-colors border ${
      active ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:text-white hover:border-white/40"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-muted-foreground text-sm">Разборы, обучающие материалы и мнения редакции.</p>
        {user?.isAdmin && (
          <Button size="sm" onClick={() => navigate("/admin")} className="font-semibold">
            <Icon name="PenLine" size={14} className="mr-2" />
            Управлять статьями
          </Button>
        )}
      </div>

      {categories && categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCategory(null)} className={chip(category === null)}>
            Все
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} className={chip(category === c.id)}>
              {c.name}
              {c.count > 0 && <span className="ml-1.5 opacity-60 font-mono text-xs">{c.count}</span>}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 bg-card" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <div className="text-white mb-3">Не удалось загрузить статьи</div>
          <Button size="sm" onClick={() => refetch()}>
            Попробовать снова
          </Button>
        </div>
      )}

      {data && !data.length && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Icon name="BookOpen" size={32} className="mx-auto text-primary mb-3" />
          <div className="text-white font-semibold">{category ? "В этой рубрике пока пусто" : "Статей пока нет"}</div>
          <div className="text-muted-foreground text-sm">Скоро здесь появятся первые материалы.</div>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setOpenId(a.id)}
              className="text-left bg-card border border-border rounded-xl overflow-hidden hover:border-primary/60 transition-colors animate-fade-in group"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              {a.cover ? (
                <img src={a.cover} alt="" loading="lazy" className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-primary/25 to-rail flex items-center justify-center">
                  <Icon name="BookOpen" size={36} className="text-primary/70" />
                </div>
              )}
              <div className="p-4">
                <div className="text-muted-foreground text-xs mb-1.5 flex items-center gap-2">
                  {a.category && <span className="text-primary uppercase tracking-wider">{a.category}</span>}
                  <span>{fmtDate(a.createdAt)}</span>
                </div>
                <h3 className="text-white font-semibold text-base leading-snug mb-1.5 group-hover:text-primary transition-colors">{a.title}</h3>
                {a.summary && <p className="text-muted-foreground text-sm line-clamp-2">{a.summary}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArticlesChannel;
