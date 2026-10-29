import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { COIN_META } from "@/lib/crypto";
import { CommunityPost, FeedResponse, communityRequest } from "@/lib/community";
import Composer from "@/components/community/Composer";
import PostCard from "@/components/community/PostCard";

type Tab = "all" | "follow" | "mood";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "follow", label: "Подписки" },
  { id: "mood", label: "Бычьи / Медвежьи" },
];

const Community = () => {
  const { user, token, ready, setAuthOpen } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [mood, setMood] = useState<"" | "bull" | "bear">("");
  const [coin, setCoin] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [meta, setMeta] = useState({ canWrite: false, loggedIn: false, isAdmin: false, me: null as number | null, more: false });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const query = (before?: number) =>
    `&tab=${tab}${tab === "mood" && mood ? `&mood=${mood}` : ""}${coin ? `&coin=${coin}` : ""}${before ? `&before=${before}` : ""}`;

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
  }, [ready, token, tab, mood, coin]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const follow = async (p: CommunityPost) => {
    try {
      const d = await communityRequest<{ following: boolean }>(token, "", { action: "follow", authorId: p.user.id });
      setPosts((list) => list.map((x) => (x.user.id === p.user.id ? { ...x, following: d.following } : x)));
    } catch (e) {
      fail(e);
    }
  };

  const remove = async (p: CommunityPost) => {
    try {
      await communityRequest(token, "", { action: "remove", id: p.id });
      setPosts((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      fail(e);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl leading-none">Т</div>
          <span className="font-display text-lg text-white tracking-wide hidden sm:inline">
            TRADERKA<span className="text-primary">.RU</span>
          </span>
        </Link>
        <Button variant="ghost" asChild className="text-muted-foreground hover:text-white hover:bg-hover">
          <Link to="/">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            На сайт
          </Link>
        </Button>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-display text-2xl text-white mb-4">Сообщество</h1>

        <div className="flex items-center gap-1 border-b border-border mb-4 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.id ? "border-primary text-white font-semibold" : "border-transparent text-muted-foreground hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
          <select
            value={coin}
            onChange={(e) => setCoin(e.target.value)}
            className="ml-auto bg-transparent text-xs text-muted-foreground outline-none cursor-pointer py-2"
            aria-label="Фильтр по монете"
          >
            <option value="">Все монеты</option>
            {Object.entries(COIN_META).map(([id, m]) => (
              <option key={id} value={id} className="bg-card">
                {m.short}
              </option>
            ))}
          </select>
        </div>

        {tab === "mood" && (
          <div className="flex gap-2 mb-3">
            {[
              { id: "" as const, label: "Все настроения" },
              { id: "bull" as const, label: "🐂 Бычьи" },
              { id: "bear" as const, label: "🐻 Медвежьи" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                className={`rounded-full px-3 py-1 text-xs border ${mood === m.id ? "border-primary text-white bg-primary/10" : "border-border text-muted-foreground hover:text-white"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {ready && !user ? (
          <div className="border-b border-border pb-4 mb-2 flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">Войдите, чтобы писать, подписываться и ставить реакции</span>
            <Button onClick={() => setAuthOpen(true)} className="rounded-full font-semibold">Войти</Button>
          </div>
        ) : meta.canWrite ? (
          <Composer token={token} onPosted={(p) => tab === "all" && setPosts((l) => [p, ...l])} />
        ) : user ? (
          <div className="border-b border-border pb-4 mb-2 text-muted-foreground text-sm flex items-center gap-2">
            <Icon name="Lock" size={14} /> Писать в сообществе можно со статуса «Студент». Читать и ставить реакции можно уже сейчас.
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4 py-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full bg-card" />
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
            {posts.map((p) => (
              <PostCard key={p.id} post={p} me={meta.me} isAdmin={meta.isAdmin} onReact={react} onFollow={follow} onRemove={remove} onCoin={setCoin} />
            ))}
            {meta.more && (
              <div className="text-center py-4">
                <Button variant="ghost" onClick={more} className="text-muted-foreground hover:text-white">
                  Показать ещё
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Community;
