import { createFileRoute, notFound } from "@tanstack/react-router";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { PROFILE_URL } from "@/lib/auth";
import { fmtDate, type Article } from "@/lib/articles";

const SITE = "https://traderka.ru";

export const Route = createFileRoute("/articles/$id")({
  loader: async ({ params }) => {
    if (!/^\d+$/.test(params.id)) throw notFound();
    const r = await fetch(`${PROFILE_URL}?resource=articles&id=${params.id}`);
    if (!r.ok) throw notFound();
    const data = (await r.json()) as { article?: Article };
    if (!data.article) throw notFound();
    return data.article;
  },
  head: ({ loaderData, params }) => {
    const a = loaderData;
    if (!a) return {};
    const desc = (a.summary || a.content || "").replace(/\s+/g, " ").slice(0, 200);
    return {
      meta: [
        { title: `${a.title} — TRADERKA.RU` },
        { name: "description", content: desc },
        { property: "og:title", content: a.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        ...(a.cover ? [{ property: "og:image", content: a.cover }] : []),
      ],
      links: [{ rel: "canonical", href: `${SITE}/articles/${params.id}` }],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const a = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <Link to="/" className="text-muted-foreground hover:text-white text-sm inline-flex items-center gap-1.5 mb-6">
          <Icon name="ArrowLeft" size={15} /> На главную
        </Link>
        <article>
          {a.cover && <img src={a.cover} alt={a.title} className="w-full h-56 sm:h-80 object-cover rounded-xl mb-5" />}
          <h1 className="font-display text-2xl sm:text-3xl text-white leading-tight mb-2">{a.title}</h1>
          <div className="text-muted-foreground text-xs mb-5 flex items-center gap-2 flex-wrap">
            {a.category && <span className="text-primary uppercase tracking-wider">{a.category}</span>}
            <span>
              {a.author} · {fmtDate(a.createdAt)}
            </span>
          </div>
          {a.summary && <p className="text-white/90 text-base sm:text-lg mb-5 leading-relaxed">{a.summary}</p>}
          <div className="text-foreground text-[14px] leading-relaxed whitespace-pre-line break-words">{a.content}</div>
        </article>
      </div>
    </div>
  );
}
