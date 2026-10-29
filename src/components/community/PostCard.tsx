import Icon from "@/components/ui/icon";
import { COIN_META } from "@/lib/crypto";
import { nameCls } from "@/lib/status";
import MemberIcon from "@/components/crypto/MemberIcon";
import { useOpenMember } from "@/lib/memberCard";
import { CommunityPost, REACTIONS, timeAgo } from "@/lib/community";

interface Props {
  post: CommunityPost;
  me: number | null;
  isAdmin: boolean;
  onReact: (p: CommunityPost, emoji: string) => void;
  onFollow: (p: CommunityPost) => void;
  onRemove: (p: CommunityPost) => void;
  onCoin: (id: string) => void;
}

const PostCard = ({ post: p, me, isAdmin, onReact, onFollow, onRemove, onCoin }: Props) => {
  const openMember = useOpenMember();
  const own = me === p.user.id;
  return (
    <article className="py-4 border-b border-border last:border-0 flex gap-3">
      <button onClick={() => openMember(p.user.id)} className="flex-shrink-0 self-start" aria-label="Открыть профиль">
        <MemberIcon name={p.user.name} level={p.user.level} avatar={p.user.avatar} className="w-10 h-10 text-base" iconSize={18} />
      </button>
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-2 flex-wrap">
          <button onClick={() => openMember(p.user.id)} className={`text-sm font-semibold hover:underline truncate ${nameCls(p.user.level)}`}>
            {p.user.name}
          </button>
          <span className="text-muted-foreground text-xs">{p.user.title}</span>
          <span className="text-muted-foreground text-xs">· {timeAgo(p.createdAt)}</span>
          {p.sentiment && (
            <span className={`text-[11px] rounded-full px-2 py-0.5 border ${p.sentiment === "bull" ? "border-metric-lime/60 text-metric-lime" : "border-down/60 text-down"}`}>
              {p.sentiment === "bull" ? "🐂 Бычий" : "🐻 Медвежий"}
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
              <button key={c} onClick={() => onCoin(c)} className="text-xs font-mono rounded-full px-2 py-0.5 bg-rail text-primary hover:bg-hover">
                ${COIN_META[c]?.short ?? c}
              </button>
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
