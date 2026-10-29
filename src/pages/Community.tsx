import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router-compat";
import { useOpenMember } from "@/lib/memberCard";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useMarkets } from "@/lib/crypto";
import { usePriceAlerts } from "@/lib/alerts";
import Ticker from "@/components/crypto/Ticker";
import HomeNav from "@/components/crypto/home/HomeNav";
import HomeSidebar from "@/components/crypto/home/HomeSidebar";
import { AuthorProfile, CommunityPost, FeedResponse, MOODS, communityRequest } from "@/lib/community";
import Composer from "@/components/community/Composer";
import PostCard from "@/components/community/PostCard";
import AuthorPanel from "@/components/community/AuthorPanel";

type Tab = "all" | "follow" | "mood";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "follow", label: "Подписки" },
  { id: "mood", label: "Бычьи / Медвежьи" },
];

const Community = () => {
  const { user, token, ready, setAuthOpen } = useAuth();
  const navigate = useNavigate();
  const { data } = useMarkets();
  const coins = data?.coins ?? [];
  const alertsApi = usePriceAlerts(coins, !!data?.live);
  const activeAlerts = alertsApi.alerts.filter((a) => !a.triggeredAt).length;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const qc = useQueryClient();
  const openMember = useOpenMember();
  const [authorId, setAuthorId] = useState<number | null>(null);
  const [filterOn, setFilterOn] = useState(false);
  const activeAuthor = authorId ?? user?.id ?? null;
  const { data: authorData, isLoading: authorLoading } = useQuery({
    queryKey: ["community-author", activeAuthor, token],
    enabled: ready && activeAuthor !== null,
    queryFn: () => communityRequest<{ author?: AuthorProfile; error?: string }>(token, `&profile=${activeAuthor}`).then((d) => d.author ?? null),
    staleTime: 30_000,
  });

  const [tab, setTab] = useState<Tab>("all");
  const [mood, setMood] = useState<"" | "bull" | "bear">("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [meta, setMeta] = useState({ canWrite: false, loggedIn: false, isAdmin: false, me: null as number | null, more: false });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const go = (ch: string, coinId?: string) => {
    setMobileSidebarOpen(false);
    navigate(`/?c=${encodeURIComponent(ch)}${coinId ? `&coin=${encodeURIComponent(coinId)}` : ""}`);
  };

  const query = (before?: number) =>
    `&tab=${tab}${tab === "mood" && mood ? `&mood=${mood}` : ""}${filterOn && activeAuthor ? `&author=${activeAuthor}` : ""}${before ? `&before=${before}` : ""}`;

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await communityRequest<FeedResponse>(token, query());
      setPosts(d.posts);
      setMeta({ canWrite: d.canWrite, loggedIn: d.loggedIn, isAdmin: d.isAdmin, me: d.me, more: d.more });
    } catch (e) {
      setPosts([]);
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    if (tab === "follow" && !token) {
      setPosts([]);
      setLoading(false);
      return;
    }
    load();
  }, [ready, token, tab, mood, filterOn, activeAuthor]); // eslint-disable-line react-hooks/exhaustive-deps

  const more = async () => {
    const last = posts[posts.length - 1];
    if (!last) return;
    const d = await communityRequest<FeedResponse>(token, query(last.id));
    setPosts((p) => [...p, ...d.posts]);
    setMeta((m) => ({ ...m, more: d.more }));
  };

  const replace = (np: CommunityPost) => setPosts((list) => list.map((x) => (x.id === np.id ? np : x)));
  const fail = (e: unknown) => toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });

  const react = async (p: CommunityPost, emoji: string) => {
    try {
      replace((await communityRequest<{ post: CommunityPost }>(token, "", { action: "react", id: p.id, emoji })).post);
    } catch (e) {
      fail(e);
    }
  };

  const followAuthor = async (id: number) => {
    try {
      const d = await communityRequest<{ following: boolean }>(token, "", { action: "follow", authorId: id });
      setPosts((list) => list.map((x) => (x.user.id === id ? { ...x, following: d.following } : x)));
      qc.invalidateQueries({ queryKey: ["community-author"] });
    } catch (e) {
      fail(e);
    }
  };

  const follow = (p: CommunityPost) => followAuthor(p.user.id);

  const pickAuthor = (id: number) => {
    setAuthorId(id);
    setFilterOn(false);
  };

  const remove = async (p: CommunityPost) => {
    try {
      await communityRequest(token, "", { action: "remove", id: p.id });
      setPosts((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      fail(e);
    }
  };

  const columns = [posts.filter((_, i) => i % 2 === 0), posts.filter((_, i) => i % 2 === 1)];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-body">
      <HomeNav go={go} />
      {coins.length > 0 && <Ticker coins={coins} onPick={(id) => go("market", id)} />}

      <div className="flex min-h-[calc(100vh-96px)]">
        <div className="flex-1 flex flex-col lg:flex-row min-w-0">
          <HomeSidebar
            channel="community"
            go={go}
            activeAlerts={activeAlerts}
            unreadOf={() => 0}
            mobileSidebarOpen={mobileSidebarOpen}
            setMobileSidebarOpen={setMobileSidebarOpen}
          />
          <AuthorPanel
            author={authorData ?? undefined}
            loading={authorLoading && activeAuthor !== null}
            loggedIn={!!user}
            filterOn={filterOn}
            onFilter={() => setFilterOn((v) => !v)}
            onFollow={() => activeAuthor && followAuthor(activeAuthor)}
            onCard={() => activeAuthor && openMember(activeAuthor)}
            onLogin={() => setAuthOpen(true)}
          />
          <main className="flex-1 flex flex-col min-w-0 grain">
            <div className="h-12 flex items-center px-4 gap-2 bg-background/80 backdrop-blur">
              <Button
                variant="ghost"
                className="lg:hidden text-muted-foreground hover:text-white hover:bg-hover p-1 h-auto mr-1"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Каналы"
              >
                <Icon name="Menu" size={20} />
              </Button>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-primary" />
              <span className="text-white font-semibold whitespace-nowrap">сообщество</span>
              <div className="w-px h-6 bg-hover mx-2 hidden sm:block" />
              <span className="text-muted-foreground text-sm hidden sm:block truncate">Мысли трейдеров, настрой рынка и обсуждение монет</span>
            </div>

            <div className="w-full max-w-5xl mx-auto px-4 py-4">
              <div className="flex flex-wrap items-center gap-x-1 border-b border-border mb-4">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.id ? "border-primary text-white font-semibold" : "border-transparent text-muted-foreground hover:text-white"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {filterOn && authorData && (
                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                  Только посты автора <span className="text-white font-semibold">{authorData.name}</span>
                  <button onClick={() => setFilterOn(false)} className="rounded-full border border-border px-2 py-0.5 hover:text-white">
                    Показать все
                  </button>
                </div>
              )}

              {tab === "mood" && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setMood("")}
                    className={`rounded-full px-3 py-1 text-xs border ${mood === "" ? "border-primary text-white bg-primary/10" : "border-border text-muted-foreground hover:text-white"}`}
                  >
                    Все настроения
                  </button>
                  {(["bull", "bear"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setMood(k)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border ${mood === k ? `${MOODS[k].cls} border-transparent font-semibold` : "border-border text-muted-foreground hover:text-white"}`}
                    >
                      <Icon name={MOODS[k].icon} size={12} /> {MOODS[k].plural}
                    </button>
                  ))}
                </div>
              )}

              {ready && !user ? (
                <div className="border-b border-border pb-4 mb-4 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground text-sm">Войдите, чтобы писать, подписываться и ставить реакции</span>
                  <Button onClick={() => setAuthOpen(true)} className="rounded-full font-semibold">Войти</Button>
                </div>
              ) : meta.canWrite ? (
                <Composer token={token} onPosted={(p) => {
                  if (tab === "all" && (!filterOn || activeAuthor === meta.me)) setPosts((l) => [p, ...l]);
                  qc.invalidateQueries({ queryKey: ["community-author"] });
                }} />
              ) : user ? (
                <div className="border-b border-border pb-4 mb-4 text-muted-foreground text-sm flex items-center gap-2">
                  <Icon name="Lock" size={14} /> Писать в сообществе можно со статуса «Студент». Читать и ставить реакции можно уже сейчас.
                </div>
              ) : null}

              {loading ? (
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full bg-card" />
                  ))}
                </div>
              ) : err ? (
                <div className="py-10 text-center text-muted-foreground text-sm">{err}</div>
              ) : posts.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  {tab === "follow" ? (user ? "Здесь появятся посты авторов, на которых вы подпишетесь" : "Войдите, чтобы видеть ленту подписок") : "Пока здесь пусто. Станьте первым!"}
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4 items-start pt-2">
                    {columns.map((col, ci) => (
                      <div key={ci} className="space-y-4 min-w-0">
                        {col.map((p) => (
                          <PostCard key={p.id} post={p} me={meta.me} isAdmin={meta.isAdmin} onReact={react} onFollow={follow} onRemove={remove} onAuthor={pickAuthor} />
                        ))}
                      </div>
                    ))}
                  </div>
                  {meta.more && (
                    <div className="text-center py-4">
                      <Button variant="ghost" onClick={more} className="text-muted-foreground hover:text-white">
                        Показать ещё
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Community;
