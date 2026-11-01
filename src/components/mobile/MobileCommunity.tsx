import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { COIN_META } from "@/lib/crypto";
import { nameCls } from "@/lib/status";
import { AuthorProfile, CommunityPost, FeedResponse, MOODS, REACTIONS, communityRequest, timeAgo } from "@/lib/community";
import UserAvatar from "@/components/crypto/UserAvatar";
import VerifiedBadge from "@/components/crypto/VerifiedBadge";
import ShopBadge from "@/components/crypto/ShopBadge";

type Tab = "all" | "follow" | "mood";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "follow", label: "Подписки" },
  { id: "mood", label: "Бык / Медведь" },
];

const MobileCommunity = ({ onClose }: { onClose: () => void }) => {
  const { token, ready, user, setAuthOpen } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [mood, setMood] = useState<"" | "bull" | "bear">("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [meta, setMeta] = useState({ canWrite: false, loggedIn: false, isAdmin: false, me: null as number | null, more: false });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [side, setSide] = useState<"" | "bull" | "bear">("");
  const [sending, setSending] = useState(false);
  const [image, setImage] = useState<{ data: string; type: string } | null>(null);
  const [coins, setCoins] = useState<string[]>([]);
  const [coinOpen, setCoinOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: me } = useQuery({
    queryKey: ["community-author", user?.id, token],
    enabled: ready && !!user,
    queryFn: () => communityRequest<{ author?: AuthorProfile }>(token, `&profile=${user?.id}`).then((d) => d.author ?? null),
    staleTime: 30_000,
  });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return toast({ title: "Подойдёт JPG, PNG или WEBP", variant: "destructive" });
    if (f.size > 3 * 1024 * 1024) return toast({ title: "Картинка должна быть до 3 МБ", variant: "destructive" });
    const rd = new FileReader();
    rd.onload = () => setImage({ data: String(rd.result), type: f.type });
    rd.readAsDataURL(f);
  };

  const toggleCoin = (id: string) => setCoins((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 5 ? [...c, id] : c));

  const query = (before?: number) => `&tab=${tab}${tab === "mood" && mood ? `&mood=${mood}` : ""}${before ? `&before=${before}` : ""}`;

  const load = useCallback(async () => {
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
  }, [token, tab, mood]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    if (tab === "follow" && !token) {
      setPosts([]);
      setLoading(false);
      return;
    }
    load();
  }, [ready, load, tab, token]);

  const more = async () => {
    const last = posts[posts.length - 1];
    if (!last) return;
    try {
      const d = await communityRequest<FeedResponse>(token, query(last.id));
      setPosts((p) => [...p, ...d.posts]);
      setMeta((m) => ({ ...m, more: d.more }));
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    }
  };

  const publish = async () => {
    if (!text.trim() && !image) return;
    setSending(true);
    try {
      const d = await communityRequest<{ post: CommunityPost }>(token, "", { action: "post", body: text, sentiment: side, coins, image: image?.data, contentType: image?.type });
      setPosts((l) => [d.post, ...l]);
      setText("");
      setSide("");
      setCoins([]);
      setImage(null);
      setCoinOpen(false);
    } catch (e) {
      toast({ title: "Не опубликовано", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const react = async (p: CommunityPost, emoji: string) => {
    try {
      const np = (await communityRequest<{ post: CommunityPost }>(token, "", { action: "react", id: p.id, emoji })).post;
      setPosts((l) => l.map((x) => (x.id === np.id ? np : x)));
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    }
  };

  const remove = async (p: CommunityPost) => {
    try {
      await communityRequest(token, "", { action: "remove", id: p.id });
      setPosts((l) => l.filter((x) => x.id !== p.id));
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    }
  };

  const follow = async (p: CommunityPost) => {
    try {
      const d = await communityRequest<{ following: boolean }>(token, "", { action: "follow", authorId: p.user.id });
      setPosts((l) => l.map((x) => (x.user.id === p.user.id ? { ...x, following: d.following } : x)));
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <button onClick={onClose} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white">
        <Icon name="ChevronLeft" size={14} /> Назад
      </button>
      <h1 className="font-display text-lg text-white flex items-center gap-2">
        <Icon name="Users" size={18} className="text-primary" /> Сообщество
      </h1>

      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors ${tab === t.id ? "bg-primary text-primary-foreground border-primary font-semibold" : "border-border text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "mood" && (
        <div className="flex gap-1.5">
          {([["", "Все"], ["bull", "Бычьи"], ["bear", "Медвежьи"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setMood(k)} className={`rounded-full px-3 py-1 text-[11px] border ${mood === k ? "border-primary text-white" : "border-border text-muted-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
      )}

      {user && me && (
        <section className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2.5">
            <UserAvatar name={me.name} avatar={me.avatar} level={me.level} className="w-10 h-10 text-base" userId={me.id} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{me.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{me.title}{me.place ? ` · место ${me.place} в рейтинге` : ""}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-2.5">
            {[
              ["Подписчики", me.followers],
              ["Подписки", me.following],
              ["Посты", me.posts],
              ["Реакции", me.reactions],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-rail/60 py-1.5 text-center min-w-0">
                <div className="font-mono text-white text-sm leading-tight">{v}</div>
                <div className="text-[10px] text-muted-foreground truncate px-0.5">{l}</div>
              </div>
            ))}
          </div>
          {(me.bulls > 0 || me.bears > 0) && (
            <div className="flex justify-center gap-4 mt-2 text-[11px]">
              <span className="text-[#22C55E]">Бычьих постов: {me.bulls}</span>
              <span className="text-[#EA3943]">Медвежьих: {me.bears}</span>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-3 space-y-2">
        {!user ? (
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground flex-1">Войдите, чтобы писать и ставить реакции</p>
            <Button size="sm" onClick={() => setAuthOpen(true)} className="font-semibold">Войти</Button>
          </div>
        ) : !meta.canWrite && !loading ? (
          <p className="text-xs text-muted-foreground">Писать в ленте пока нельзя. Ваш статус откроет эту возможность позже.</p>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder="Что думаете о рынке?"
              className="w-full bg-transparent text-white placeholder:text-muted-foreground outline-none resize-none min-h-[64px] text-sm"
            />
            {image && (
              <div className="relative inline-block">
                <img src={image.data} alt="" className="max-h-40 rounded-lg border border-border" />
                <button onClick={() => setImage(null)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center" aria-label="Убрать картинку">
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
            {coins.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {coins.map((c) => (
                  <button key={c} onClick={() => toggleCoin(c)} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border border-border text-white font-mono">
                    ${COIN_META[c]?.short ?? c} <Icon name="X" size={10} />
                  </button>
                ))}
              </div>
            )}
            {coinOpen && (
              <div className="rounded-lg border border-border bg-rail p-1.5 max-h-44 overflow-y-auto grid grid-cols-2 gap-1">
                {Object.entries(COIN_META).map(([id, m]) => (
                  <button key={id} onClick={() => toggleCoin(id)} className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${coins.includes(id) ? "bg-primary/15 text-white" : "text-muted-foreground"}`}>
                    <span className="truncate">{m.ru}</span>
                    <span className="font-mono text-[10px]">{coins.includes(id) ? "✓" : m.short}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-full border border-border text-muted-foreground flex items-center justify-center" aria-label="Прикрепить картинку">
                <Icon name="Image" size={15} />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
              <button onClick={() => setCoinOpen(!coinOpen)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border ${coinOpen || coins.length ? "border-primary text-white" : "border-border text-muted-foreground"}`}>
                <Icon name="CircleDollarSign" size={12} /> Монета{coins.length ? ` (${coins.length})` : ""}
              </button>
              {(["bull", "bear"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setSide(side === k ? "" : k)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border ${side === k ? MOODS[k].cls + " border-transparent font-semibold" : "border-border text-muted-foreground"}`}
                >
                  <Icon name={MOODS[k].icon} size={11} /> {MOODS[k].label}
                </button>
              ))}
              <Button size="sm" disabled={sending || (!text.trim() && !image)} onClick={publish} className="ml-auto rounded-full font-semibold px-4">
                {sending && <Icon name="Loader2" size={13} className="mr-1 animate-spin" />}
                Опубликовать
              </Button>
            </div>
          </>
        )}
      </section>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-28 w-full bg-card" />
          <Skeleton className="h-28 w-full bg-card" />
        </div>
      ) : err ? (
        <p className="text-sm text-down">{err}</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground py-10">
          {tab === "follow" && !user ? "Войдите, чтобы видеть ленту подписок" : tab === "follow" ? "Подпишитесь на авторов, и их посты появятся здесь" : "Постов пока нет"}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => {
            const own = meta.me === p.user.id;
            return (
              <article key={p.id} className="rounded-xl border border-border bg-card p-3">
                <header className="flex items-center gap-2">
                  <UserAvatar name={p.user.name} avatar={p.user.avatar} level={p.user.level} className="w-9 h-9 text-sm" userId={p.user.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-sm font-semibold truncate ${nameCls(p.user.level)}`}>{p.user.name}</span>
                      <VerifiedBadge userId={p.user.id} size={13} />
                      <ShopBadge userId={p.user.id} size={15} />
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{p.user.title} · {timeAgo(p.createdAt)}</div>
                  </div>
                  {p.sentiment && (
                    <span className={`inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 font-semibold ${MOODS[p.sentiment].cls}`}>
                      <Icon name={MOODS[p.sentiment].icon} size={10} /> {MOODS[p.sentiment].label}
                    </span>
                  )}
                  {user && !own && (
                    <button onClick={() => follow(p)} className={`text-[11px] rounded-full px-2.5 py-1 border ${p.following ? "border-border text-muted-foreground" : "border-primary text-primary"}`}>
                      {p.following ? "Вы подписаны" : "Подписаться"}
                    </button>
                  )}
                  {(own || meta.isAdmin) && (
                    <button onClick={() => remove(p)} className="text-muted-foreground hover:text-down" aria-label="Убрать пост">
                      <Icon name="Trash2" size={14} />
                    </button>
                  )}
                </header>
                {p.body && <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-2">{p.body}</p>}
                {p.coins.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.coins.map((c) => (
                      <span key={c} className="text-[11px] font-mono rounded-full px-2 py-0.5 bg-rail text-primary">${COIN_META[c]?.short ?? c}</span>
                    ))}
                  </div>
                )}
                {p.image && <img src={p.image} alt="" loading="lazy" className="mt-2 rounded-lg border border-border max-h-72 w-full object-cover" />}
                <footer className="flex flex-wrap gap-1 mt-2">
                  {REACTIONS.map((e) => {
                    const n = p.reactions[e] ?? 0;
                    const active = p.mine.includes(e);
                    return (
                      <button
                        key={e}
                        onClick={() => (user ? react(p, e) : setAuthOpen(true))}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm border ${active ? "border-primary bg-primary/10 text-white" : n ? "border-border text-foreground" : "border-transparent text-muted-foreground"}`}
                      >
                        <span>{e}</span>
                        {n > 0 && <span className="text-[11px] font-mono">{n}</span>}
                      </button>
                    );
                  })}
                </footer>
              </article>
            );
          })}
          {meta.more && (
            <Button variant="secondary" className="w-full" onClick={more}>Показать ещё</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileCommunity;
