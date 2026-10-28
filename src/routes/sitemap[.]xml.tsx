import { createFileRoute } from "@tanstack/react-router";
import { PROFILE_URL } from "@/lib/auth";
import type { Article } from "@/lib/articles";

const SITE = "https://traderka.ru";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let articles: Article[] = [];
        try {
          const r = await fetch(`${PROFILE_URL}?resource=articles&limit=200`);
          if (r.ok) articles = ((await r.json()) as { articles?: Article[] }).articles ?? [];
        } catch {
          articles = [];
        }
        const url = (loc: string, freq: string, prio: string, lastmod?: string) =>
          `  <url>\n    <loc>${loc}</loc>\n${lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>\n` : ""}    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`;
        const items = [
          url(`${SITE}/`, "daily", "1.0"),
          url(`${SITE}/rating`, "daily", "0.8"),
          ...articles.map((a) => url(`${SITE}/articles/${a.id}`, "weekly", "0.7", a.updatedAt)),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</urlset>\n`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
