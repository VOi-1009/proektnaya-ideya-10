import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import Message from "../Message";
import ReactionButtons from "../ReactionButtons";
import { useAuth } from "@/lib/auth";
import { useReactions } from "@/lib/reactions";
import { fmtNewsTime, markSeen, NEWS_SOURCES, NEWS_TAGS, NewsKind, NewsTag, SOURCE_STYLE, TAG_STYLE, useNews } from "../news";

const PAGE = 15;

const NewsChannel = ({ kind = "crypto" }: { kind?: NewsKind }) => {
  const { token } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useNews(kind);
  const [tag, setTag] = useState<NewsTag | "Все">("Все");
  const [source, setSource] = useState<string | null>(null);
  const [coin, setCoin] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const lastTop = useRef<string | null>(null);

  const items = useMemo(() => data?.items ?? [], [data]);

  useEffect(() => {
    if (!items.length) return;
    markSeen(items[0].ts, kind);
    const top = items[0].id;
    if (lastTop.current && lastTop.current !== top) {
      const idx = items.findIndex((n) => n.id === lastTop.current);
      const fresh = idx === -1 ? 1 : idx;
      toast({ title: "Свежие новости", description: `Новых публикаций: ${fresh}` });
    }
    lastTop.current = top;
  }, [items, kind]);

  const coinsInFeed = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((n) => n.coins.forEach((c) => (m[c] = (m[c] ?? 0) + 1)));
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([c]) => c);
  }, [items]);

  const list = items.filter(
    (n) => (tag === "Все" || n.tag === tag) && (!coin || n.coins.includes(coin)) && (!source || n.source === source),
  );
  const visibleIds = list.slice(0, limit).map((n) => n.id);
  const { reactions, react } = useReactions(visibleIds, token);
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";

  const chip = (active: boolean) =>
    `text-xs px-3 py-1 rounded-full border transition-colors ${
      active ? "bg-white text-black border-white" : "border-input text-muted-foreground hover:text-white hover:border-white/40"
    }`;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mt-2 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          {["Все", ...NEWS_TAGS[kind]].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTag(t);
                setLimit(PAGE);
              }}
              className={chip(tag === t)}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {updated && (
              <span className="hidden sm:flex items-center gap-1.5 font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${isError ? "bg-down" : "bg-up animate-pulse"}`} />
                {updated}
              </span>
            )}
            <button
              onClick={() => refetch()}
              className="hover:text-white p-1"
              aria-label="Обновить новости"
              title="Обновить"
              disabled={isFetching}
            >
              <Icon name="RefreshCw" size={14} className={isFetching ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-muted-foreground mr-1">Источники:</span>
          {NEWS_SOURCES[kind].map((src) => (
            <button
              key={src}
              onClick={() => {
                setSource(source === src ? null : src);
                setLimit(PAGE);
              }}
              className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                source === src ? "bg-primary/15 border-primary text-white" : "border-transparent bg-card text-muted-foreground hover:text-white"
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-sm text-[8px] font-bold flex items-center justify-center ${SOURCE_STYLE[src]?.cls ?? "bg-hover"}`}>
                {SOURCE_STYLE[src]?.avatar ?? src[0]}
              </span>
              {src}
            </button>
          ))}
        </div>
        {kind === "crypto" && coinsInFeed.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {coinsInFeed.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCoin(coin === c ? null : c);
                  setLimit(PAGE);
                }}
                className={`font-mono text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  coin === c ? "bg-primary/15 border-primary text-white" : "border-transparent bg-card text-muted-foreground hover:text-white"
                }`}
              >
                ${c}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading &&
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-10 h-10 rounded-full bg-card" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40 bg-card" />
              <Skeleton className="h-24 w-full max-w-2xl bg-card" />
            </div>
          </div>
        ))}

      {isError && !items.length && (
        <div className="bg-card border border-border rounded-lg p-6 text-center max-w-2xl">
          <Icon name="WifiOff" size={28} className="mx-auto mb-2 text-muted-foreground" />
          <div className="text-white font-semibold">Не удалось загрузить новости</div>
          <div className="text-muted-foreground text-sm mb-3">{(error as Error)?.message}</div>
          <Button onClick={() => refetch()} size="sm">
            Попробовать снова
          </Button>
        </div>
      )}

      {!isLoading && items.length > 0 && !list.length && (
        <div className="text-muted-foreground text-sm py-8 text-center">По этому фильтру свежих новостей нет.</div>
      )}

      {list.slice(0, limit).map((n, idx) => {
        const isOpen = open === n.id;
        return (
          <Message key={n.id} author="" time="" bot delay={Math.min(idx, 8) * 40}>
            <article className="bg-card border-l-4 border-primary rounded overflow-hidden max-w-2xl flex flex-col sm:flex-row">
              <div className="p-3 sm:p-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs text-white/80 font-medium">{n.source}</span>
                  <span className="text-xs text-muted-foreground">{fmtNewsTime(n.ts)}</span>
                  <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${TAG_STYLE[n.tag]}`}>
                    {n.tag}
                  </span>
                  {Date.now() - n.ts < 60 * 60_000 && (
                    <span className="text-[10px] uppercase tracking-wider bg-down/15 text-down rounded px-1.5 py-0.5 flex items-center gap-1">
                      <Icon name="Flame" size={10} /> Свежее
                    </span>
                  )}
                  {n.coins.map((c) => (
                    <span key={c} className="font-mono text-[11px] text-muted-foreground">
                      ${c}
                    </span>
                  ))}
                </div>
                <h3 className="text-white font-semibold text-sm sm:text-base leading-snug mb-1.5">{n.title}</h3>
                {n.text && (
                  <p className={`text-muted-foreground text-sm ${isOpen ? "" : "line-clamp-2"}`}>{n.text}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
                  <ReactionButtons value={reactions[n.id]} onReact={(v) => react(n.id, v)} />
                  {n.text.length > 140 && (
                    <button onClick={() => setOpen(isOpen ? null : n.id)} className="text-primary hover:underline">
                      {isOpen ? "Свернуть" : "Читать полностью"}
                    </button>
                  )}
                  <a href={n.link} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white inline-flex items-center gap-1 ml-auto">
                    Источник <Icon name="ExternalLink" size={12} />
                  </a>
                </div>
              </div>
            </article>
          </Message>
        );
      })}

      {list.length > limit && (
        <div>
          <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)} className="bg-transparent border-input hover:bg-hover hover:text-white">
            Показать ещё
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground/70 pb-2">
          Новости обновляются автоматически каждые 2 минуты.
        </p>
      )}
    </div>
  );
};

export default NewsChannel;
