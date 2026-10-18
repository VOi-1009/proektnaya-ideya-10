import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  ForumPost, ForumSectionItem, ForumTopicItem, ForumPerms, LEVEL_NAMES, PLAN_NAMES, forumRequest,
} from "@/lib/forum";
import { useOpenMember } from "@/lib/memberCard";
import UserAvatar from "../UserAvatar";
import BotBadge from "../BotBadge";
import SupporterBadge from "../SupporterBadge";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const ago = (iso: string | null) => {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  if (m < 1440) return `${Math.floor(m / 60)} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

type View = { s: "home" } | { s: "section"; id: number } | { s: "topic"; id: number; section: number };

const ForumChannel = () => {
  const { user, token } = useAuth();
  const [view, setView] = useState<View>({ s: "home" });

  if (!user)
    return <Gate icon="LogIn" title="Форум — для участников" text="Войдите в аккаунт, чтобы открыть форум." />;

  return view.s === "home" ? (
    <Home token={token} open={(id) => setView({ s: "section", id })} />
  ) : view.s === "section" ? (
    <Section token={token} id={view.id} back={() => setView({ s: "home" })} open={(id) => setView({ s: "topic", id, section: view.id })} />
  ) : (
    <Topic token={token} id={view.id} back={() => setView({ s: "section", id: view.section })} />
  );
};

const Gate = ({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3">
    <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto">
      <Icon name={icon} size={22} />
    </div>
    <h3 className="text-white font-semibold text-lg">{title}</h3>
    <p className="text-muted-foreground text-sm max-w-md mx-auto">{text}</p>
    {action}
  </div>
);

const needText = (s: ForumSectionItem) => {
  const parts = [PLAN_NAMES[s.need.plan] ?? ""];
  if (s.need.level > 1) parts.push(`статус «${LEVEL_NAMES[s.need.level]}» и выше`);
  return parts.filter(Boolean).join(", ");
};

const Home = ({ token, open }: { token: string | null; open: (id: number) => void }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["forum-home", token],
    queryFn: () => forumRequest<{ sections: ForumSectionItem[]; tier: number }>(token),
  });
  if (isLoading) return <Skeleton className="h-64 w-full bg-card" />;
  const all = data?.sections ?? [];
  const roots = all.filter((s) => !s.parentId);

  if (!all.length)
    return <Gate icon="MessagesSquare" title="Форум пока пуст" text="Администратор ещё не создал разделы." />;

  return (
    <div className="space-y-4 animate-fade-in">
      {roots.map((r) => {
        const kids = all.filter((s) => s.parentId === r.id);
        return (
          <section key={r.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <SectionRow s={r} open={open} head />
            {kids.map((k) => (
              <SectionRow key={k.id} s={k} open={open} />
            ))}
          </section>
        );
      })}
    </div>
  );
};

const SectionRow = ({ s, open, head }: { s: ForumSectionItem; open: (id: number) => void; head?: boolean }) => (
  <button
    onClick={() => (s.can.read ? open(s.id) : toast({ title: "Раздел закрыт", description: `Доступ: ${needText(s)}` }))}
    className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover/60 ${
      head ? "bg-rail/50" : "border-t border-border/60 pl-8"
    }`}
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.can.read ? "bg-primary/15 text-primary" : "bg-rail text-muted-foreground"}`}>
      <Icon name={s.can.read ? (head ? "FolderOpen" : "MessageSquare") : "Lock"} size={17} />
    </div>
    <div className="flex-1 min-w-0">
      <div className={`font-semibold truncate ${s.can.read ? "text-white" : "text-muted-foreground"}`}>{s.title}</div>
      <div className="text-xs text-muted-foreground truncate">{s.can.read ? s.description : `Доступ: ${needText(s)}`}</div>
    </div>
    {s.can.read && (
      <div className="text-right text-[11px] text-muted-foreground font-mono flex-shrink-0 hidden sm:block">
        <div>{s.topics} тем · {s.posts} сообщ.</div>
        <div>{ago(s.lastPostAt)}</div>
      </div>
    )}
    <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
  </button>
);

const Back = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button onClick={onClick} className="text-muted-foreground hover:text-white text-sm inline-flex items-center gap-1.5">
    <Icon name="ArrowLeft" size={15} /> {label}
  </button>
);

const Author = ({ u, small }: { u: ForumTopicItem["user"]; small?: boolean }) => {
  const openMember = useOpenMember();
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <button onClick={() => openMember(u.id)} className={`font-semibold hover:underline ${small ? "text-xs text-white/90" : "text-sm text-white"}`}>
        {u.name}
      </button>
      {u.isAi && <BotBadge ai compact />}
      <SupporterBadge no={u.supporter} creator={u.creator} compact />
    </span>
  );
};

const Section = ({ token, id, back, open }: { token: string | null; id: number; back: () => void; open: (id: number) => void }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["forum-section", id, token],
    queryFn: () =>
      forumRequest<{ section: { title: string; description: string }; can: ForumPerms; topics: ForumTopicItem[] }>(token, `&section=${id}`),
    retry: false,
  });

  const create = async () => {
    setBusy(true);
    try {
      const d = await forumRequest<{ id: number }>(token, "", { action: "topic", sectionId: id, title, text });
      await qc.invalidateQueries({ queryKey: ["forum-section"] });
      qc.invalidateQueries({ queryKey: ["forum-home"] });
      setTitle("");
      setText("");
      setComposing(false);
      open(d.id);
    } catch (e) {
      toast({ title: "Тема не создана", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full bg-card" />;
  if (error || !data)
    return (
      <div className="space-y-3">
        <Back onClick={back} label="Все разделы" />
        <Gate icon="Lock" title="Раздел недоступен" text={(error as Error)?.message ?? "Нет доступа"} />
      </div>
    );

  return (
    <div className="space-y-3 animate-fade-in">
      <Back onClick={back} label="Все разделы" />
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl text-white">{data.section.title}</h2>
          {data.section.description && <p className="text-muted-foreground text-sm">{data.section.description}</p>}
        </div>
        {data.can.topic && !composing && (
          <Button onClick={() => setComposing(true)} className="font-semibold">
            <Icon name="Plus" size={16} className="mr-1.5" /> Новая тема
          </Button>
        )}
      </div>

      {composing && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 animate-fade-in">
          <input className={inputCls} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок темы" autoFocus />
          <textarea
            className={`${inputCls} h-32 py-2 resize-y`}
            value={text}
            maxLength={5000}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст первого сообщения"
          />
          <div className="flex gap-2">
            <Button onClick={create} disabled={busy || title.trim().length < 3 || !text.trim()} className="font-semibold">
              {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
              Создать тему
            </Button>
            <Button variant="ghost" onClick={() => setComposing(false)} className="text-muted-foreground hover:text-white hover:bg-hover">
              Отмена
            </Button>
          </div>
        </div>
      )}
      {!data.can.topic && user && (
        <p className="text-xs text-muted-foreground">Создавать темы в этом разделе могут не все — вы можете читать и отвечать, если это разрешено.</p>
      )}

      {data.topics.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">Пока нет тем. Начните первую!</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {data.topics.map((t, i) => (
            <button
              key={t.id}
              onClick={() => open(t.id)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-hover/60 transition-colors ${i > 0 ? "border-t border-border/60" : ""}`}
            >
              <UserAvatar name={t.user.name} avatar={t.user.avatar} className="w-8 h-8 text-xs" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  {t.pinned && <Icon name="Pin" size={13} className="text-amber-300 flex-shrink-0" />}
                  {t.closed && <Icon name="Lock" size={13} className="text-muted-foreground flex-shrink-0" />}
                  <span className="truncate">{t.title}</span>
                </div>
                <div className="text-xs text-muted-foreground">{t.user.name} · {ago(t.createdAt)}</div>
              </div>
              <div className="text-right text-[11px] text-muted-foreground font-mono flex-shrink-0">
                <div className="flex items-center gap-1 justify-end"><Icon name="MessageCircle" size={12} /> {t.posts - 1}</div>
                <div>{ago(t.lastPostAt)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Topic = ({ token, id, back }: { token: string | null; id: number; back: () => void }) => {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const key = ["forum-topic", id, token];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () =>
      forumRequest<{
        topic: { id: number; title: string; pinned: boolean; closed: boolean };
        section: { id: number; title: string };
        can: { reply: boolean; moderate: boolean };
        posts: ForumPost[];
      }>(token, `&topic=${id}`),
    retry: false,
    refetchInterval: 15000,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["forum-topic"] });
    qc.invalidateQueries({ queryKey: ["forum-section"] });
    qc.invalidateQueries({ queryKey: ["forum-home"] });
  };
  const act = async (body: object, ok?: string) => {
    try {
      const d = await forumRequest<{ topicDeleted?: boolean }>(token, "", body);
      if (ok) toast({ title: ok });
      refresh();
      if (d.topicDeleted || (body as { action: string }).action === "delete-topic") back();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };
  const reply = async () => {
    setBusy(true);
    try {
      await forumRequest(token, "", { action: "reply", topicId: id, text });
      setText("");
      refresh();
    } catch (e) {
      toast({ title: "Не отправлено", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full bg-card" />;
  if (error || !data)
    return (
      <div className="space-y-3">
        <Back onClick={back} label="Назад" />
        <Gate icon="Lock" title="Тема недоступна" text={(error as Error)?.message ?? "Нет доступа"} />
      </div>
    );

  return (
    <div className="space-y-3 animate-fade-in">
      <Back onClick={back} label={data.section.title} />
      <div className="flex items-start gap-2 flex-wrap">
        <h2 className="font-display text-xl sm:text-2xl text-white flex-1 min-w-0 break-words">
          {data.topic.pinned && <Icon name="Pin" size={16} className="inline text-amber-300 mr-1.5" />}
          {data.topic.title}
        </h2>
        {data.can.moderate && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => act({ action: "pin", id, on: !data.topic.pinned })} className="bg-transparent border-input hover:bg-hover hover:text-white">
              <Icon name="Pin" size={14} className="mr-1" /> {data.topic.pinned ? "Открепить" : "Закрепить"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => act({ action: "close", id, on: !data.topic.closed })} className="bg-transparent border-input hover:bg-hover hover:text-white">
              <Icon name={data.topic.closed ? "LockOpen" : "Lock"} size={14} className="mr-1" /> {data.topic.closed ? "Открыть" : "Закрыть"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.confirm("Удалить тему целиком?") && act({ action: "delete-topic", id }, "Тема удалена")}
              className="bg-transparent border-input text-down hover:bg-hover hover:text-down"
            >
              <Icon name="Trash2" size={14} />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {data.posts.map((p, i) => (
          <article key={p.id} className="bg-card border border-border rounded-xl p-4 flex gap-3 group">
            <UserAvatar name={p.user.name} avatar={p.user.avatar} className="w-9 h-9 text-sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Author u={p.user} />
                <span className="text-[10px] text-muted-foreground font-mono">{ago(p.createdAt)}</span>
                {p.canDelete && (
                  <button
                    onClick={() =>
                      window.confirm(i === 0 ? "Удалить всю тему?" : "Удалить сообщение?") && act({ action: "delete-post", id: p.id }, "Удалено")
                    }
                    className="ml-auto text-muted-foreground hover:text-down sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    title="Удалить"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground/90 mt-1.5 whitespace-pre-line break-words leading-relaxed">{p.text}</p>
            </div>
          </article>
        ))}
      </div>

      {data.can.reply ? (
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <textarea
            className={`${inputCls} h-24 py-2 resize-y`}
            value={text}
            maxLength={5000}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ваш ответ…"
          />
          <Button onClick={reply} disabled={busy || !text.trim()} className="font-semibold">
            {busy ? <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" /> : <Icon name="Send" size={16} className="mr-1.5" />}
            Ответить
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          {data.topic.closed ? "Тема закрыта для ответов." : "Отвечать в этом разделе вам пока нельзя."}
        </p>
      )}
    </div>
  );
};

export default ForumChannel;
