import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { AiComment, AiPost, REACTIONS, aiRequest } from "@/lib/aibot";
import { useOpenMember } from "@/lib/memberCard";
import UserAvatar from "./UserAvatar";
import BotBadge from "./BotBadge";
import TierBadge from "./TierBadge";
import SupporterBadge from "./SupporterBadge";

const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const AiPostSocial = ({ post }: { post: AiPost }) => {
  const { user, token, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const openMember = useOpenMember();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const key = ["ai-comments", post.id];
  const { data: comments, isLoading } = useQuery({
    queryKey: [...key, token],
    enabled: open,
    queryFn: () => aiRequest<{ comments: AiComment[] }>(token, `&comments=${post.id}`).then((d) => d.comments),
  });

  const refreshPosts = () => qc.invalidateQueries({ queryKey: ["ai-posts"] });
  const needAuth = () => {
    toast({ title: "Оценивать и комментировать могут только зарегистрированные пользователи" });
    setAuthOpen(true);
  };

  const react = async (kind: string) => {
    if (!user) return needAuth();
    try {
      await aiRequest(token, "", { action: "react", postId: post.id, kind });
      refreshPosts();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const send = async () => {
    if (!user) return needAuth();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const d = await aiRequest<{ comments: AiComment[] }>(token, "", { action: "comment", postId: post.id, text });
      qc.setQueryData([...key, token], d.comments);
      setText("");
      refreshPosts();
    } catch (e) {
      toast({ title: "Не отправлено", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    try {
      const d = await aiRequest<{ comments: AiComment[] }>(token, "", { action: "delete-comment", id });
      qc.setQueryData([...key, token], d.comments);
      refreshPosts();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const counts = post.reactions ?? {};
  const mine = post.mine ?? [];
  const total = post.comments ?? 0;

  return (
    <div className="mt-4 pt-3 border-t border-border/60 space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTIONS.map((r) => {
          const n = counts[r.kind] ?? 0;
          const active = mine.includes(r.kind);
          return (
            <button
              key={r.kind}
              onClick={() => react(r.kind)}
              title={r.label}
              aria-label={r.label}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-mono tabular transition-colors ${
                active ? r.cls : "border-input text-muted-foreground hover:text-white hover:border-white/40"
              }`}
            >
              {r.icon ? <Icon name={r.icon} size={13} /> : <span className="text-sm leading-none">{r.emoji}</span>}
              {n > 0 && n}
            </button>
          );
        })}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
            open ? "bg-hover text-white" : "text-muted-foreground hover:text-white hover:bg-hover/60"
          }`}
        >
          <Icon name="MessageCircle" size={14} />
          {total > 0 ? `Комментарии · ${total}` : "Комментировать"}
        </button>
      </div>

      {open && (
        <div className="space-y-2 animate-fade-in">
          {isLoading ? (
            <p className="text-muted-foreground text-xs">Загружаю…</p>
          ) : (comments ?? []).length === 0 ? (
            <p className="text-muted-foreground text-xs">Пока никто не прокомментировал — будьте первым.</p>
          ) : (
            (comments ?? []).map((c) => (
              <div key={c.id} className="flex gap-2.5 group">
                <button onClick={() => openMember(c.user.id)} className="flex-shrink-0 mt-0.5">
                  <UserAvatar name={c.user.name} avatar={c.user.avatar} className="w-7 h-7 text-xs" />
                </button>
                <div className="flex-1 min-w-0 bg-rail/60 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <button onClick={() => openMember(c.user.id)} className="text-white font-semibold hover:underline">
                      {c.user.name}
                    </button>
                    {c.user.isAi && <BotBadge ai compact />}
                    <TierBadge tier={c.user.tier} compact />
                    <SupporterBadge no={c.user.supporter} creator={c.user.creator} compact />
                    <span className="text-muted-foreground/70 font-mono text-[10px]">{fmt(c.createdAt)}</span>
                    {c.canDelete && (
                      <button
                        onClick={() => remove(c.id)}
                        className="ml-auto text-muted-foreground hover:text-down sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        title="Удалить"
                      >
                        <Icon name="Trash2" size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-line break-words">{c.text}</p>
                </div>
              </div>
            ))
          )}

          {user ? (
            <div className="flex gap-2 items-end pt-1">
              <textarea
                value={text}
                maxLength={1000}
                rows={1}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ваш комментарий…"
                className="flex-1 bg-rail rounded px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground resize-none min-h-10 max-h-32"
              />
              <Button onClick={send} disabled={busy || !text.trim()} className="font-semibold h-10">
                {busy ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Send" size={16} />}
              </Button>
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="text-xs text-primary hover:underline">
              Войдите, чтобы оставить комментарий
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AiPostSocial;
