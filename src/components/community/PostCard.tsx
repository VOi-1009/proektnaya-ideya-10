import Icon from "@/components/ui/icon";
import { COIN_META } from "@/lib/crypto";
import { nameCls } from "@/lib/status";
import MemberIcon from "@/components/crypto/MemberIcon";
import { CommunityPost, MOODS, REACTIONS, timeAgo } from "@/lib/community";

interface Props {
  post: CommunityPost;
  me: number | null;
  isAdmin: boolean;
  onReact: (p: CommunityPost, emoji: string) => void;
  onFollow: (p: CommunityPost) => void;
  onRemove: (p: CommunityPost) => void;
  onAuthor: (id: number) => void;
}

const PostCard = ({ post: p, me, isAdmin, onReact, onFollow, onRemove, onAuthor }: Props) => {
  const own = me === p.user.id;
  return (
    <article className="rounded-xl border border-border bg-card p-4 flex gap-3">
      <button onClick={() => onAuthor(p.user.id)} className="flex-shrink-0 self-start" aria-label="Страница автора">
        <MemberIcon name={p.user.name} level={p.user.level} avatar={p.user.avatar} className="w-10 h-10 text-base" iconSize={18} />
      </button>
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-2 flex-wrap">
          <button onClick={() => onAuthor(p.user.id)} className={`text-sm font-semibold hover:underline truncate ${nameCls(p.user.level)}`}>
            {p.user.name}
          </button>
          <span className="text-muted-foreground text-xs">{p.user.title}</span>
          <span className="text-muted-foreground text-xs">· {timeAgo(p.createdAt)}</span>
          {p.sentiment && (
            <span className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 font-semibold ${MOODS[p.sentiment].cls}`}>
              <Icon name={MOODS[p.sentiment].icon} size={11} /> {MOODS[p.sentiment].label}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {me && !own && (
              <button
                onClick={() => onFollow(p)}
                className={`text-xs rounded-full px-3 py-1 border transition-colors ${p.following ? "border-border text-muted-foreground hover:text-down hover:border-down" : "border-primary text-primary hover:bg-primary/10"}`}
              >
                {p.following ? "Вы подписаны" : "Подписаться"}
              </button>
            )}
            {(own || isAdmin) && (
              <button onClick={() => onRemove(p)} className="w-7 h-7 rounded-full text-muted-foreground hover:text-down hover:bg-hover flex items-center justify-center" aria-label="Убрать пост">
                <Icon name="Trash2" size={14} />
              </button>
            )}
          </div>
        </header>
        {p.body && <p className="text-[15px] text-foreground whitespace-pre-wrap break-words mt-1.5">{p.body}</p>}
        {p.coins.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {p.coins.map((c) => (
              <span key={c} className="text-xs font-mono rounded-full px-2 py-0.5 bg-rail text-primary">
                ${COIN_META[c]?.short ?? c}
              </span>
            ))}
          </div>
        )}
        {p.image && <img src={p.image} alt="" loading="lazy" className="mt-3 rounded-xl border border-border max-h-[420px] object-cover" />}
        <footer className="flex flex-wrap gap-1.5 mt-3">
          {REACTIONS.map((e) => {
            const n = p.reactions[e] ?? 0;
            const active = p.mine.includes(e);
            return (
              <button
                key={e}
                onClick={() => onReact(p, e)}
                disabled={!me}
                title={me ? undefined : "Войдите, чтобы поставить реакцию"}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm border transition-colors ${
                  active ? "border-primary bg-primary/10 text-white" : n ? "border-border text-foreground hover:border-primary/60" : "border-transparent text-muted-foreground hover:bg-hover"
                }`}
              >
                <span>{e}</span>
                {n > 0 && <span className="text-xs font-mono">{n}</span>}
              </button>
            );
          })}
        </footer>
      </div>
    </article>
  );
};

export default PostCard;
