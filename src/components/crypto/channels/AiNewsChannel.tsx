import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AI_NAME, useAiPosts } from "@/lib/aibot";
import { useOpenMember } from "@/lib/memberCard";
import BotBadge from "../BotBadge";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const AiAvatar = () => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(139,92,246,0.5)] flex-shrink-0">
    <Icon name="Sparkles" size={18} />
  </div>
);

const AiNewsChannel = () => {
  const { data, isLoading } = useAiPosts();
  const openMember = useOpenMember();
  const posts = data?.posts ?? [];
  const open = () => data?.botId && openMember(data.botId);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-indigo-400/30 rounded-xl p-4 sm:p-5 flex items-center gap-4 bg-gradient-to-r from-indigo-500/10 via-card to-card">
        <button onClick={open} className="relative">
          <AiAvatar />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-up ring-2 ring-card" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={open} className="text-white font-semibold hover:underline">{AI_NAME}</button>
            <BotBadge ai />
            <span className="text-xs text-green-400">в сети</span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            ИИ-бот TRADERKA.RU. Следит за порядком в чатах, оценивает новости и несколько раз в день собирает дайджест самого обсуждаемого.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full bg-card" />
          <Skeleton className="h-32 w-full bg-card" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          {AI_NAME} пока собирает материал — первый дайджест появится, как только участники оценят свежие новости.
        </div>
      ) : (
        posts.map((p) => (
          <article key={p.id} className="flex gap-3">
            <button onClick={open} className="mt-1 hidden sm:block">
              <AiAvatar />
            </button>
            <div className="flex-1 min-w-0 bg-card border border-border rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-indigo-300 font-semibold">{AI_NAME}</span>
                <BotBadge ai compact />
                <span className="text-muted-foreground font-mono">{fmt(p.createdAt)}</span>
                {p.kind === "auto" && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Icon name="Wand2" size={11} /> автодайджест
                  </span>
                )}
              </div>
              <h3 className="text-white font-semibold text-base sm:text-lg mt-1.5">{p.title}</h3>
              {p.body && <p className="text-foreground/90 text-sm mt-2 whitespace-pre-line leading-relaxed">{p.body}</p>}
              {p.links.length > 0 && (
                <div className="mt-3 flex flex-col gap-1">
                  {p.links.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1 truncate"
                    >
                      <Icon name="ExternalLink" size={11} className="flex-shrink-0" />
                      <span className="truncate">{l.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  );
};

export default AiNewsChannel;
