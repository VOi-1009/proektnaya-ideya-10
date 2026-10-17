import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { CHAT_MIN_LEVEL, CHAT_ROOMS, ChatMessage, ChatRoom, chatRequest } from "@/lib/chat";
import { levelInfo, nameCls } from "@/lib/status";
import { useOpenMember } from "@/lib/memberCard";
import MemberIcon from "../MemberIcon";
import SupporterBadge from "../SupporterBadge";
import DonateButton from "../DonateButton";
import BotBadge from "../BotBadge";

const Locked = ({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-8 text-center max-w-lg mx-auto mt-6">
    <div className="w-12 h-12 rounded-full bg-hover flex items-center justify-center mx-auto mb-3 text-muted-foreground">
      <Icon name={icon} size={22} />
    </div>
    <h3 className="text-white font-semibold">{title}</h3>
    <p className="text-muted-foreground text-sm mt-1.5">{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const time = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const ChatRoomView = ({ room }: { room: ChatRoom }) => {
  const { token } = useAuth();
  const qc = useQueryClient();
  const openMember = useOpenMember();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["chat", room, token],
    queryFn: () => chatRequest<{ items: ChatMessage[] }>(token, room),
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });
  const items = data?.items ?? [];
  const lastId = items[items.length - 1]?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await chatRequest(token, room, "", { text: t });
      setText("");
      await qc.invalidateQueries({ queryKey: ["chat", room] });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (error) return <Locked icon="Lock" title="Чат недоступен" text={(error as Error).message} />;

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col h-[calc(100vh-220px)] min-h-[420px]">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-4 space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Загружаю сообщения…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center mt-10">Здесь пока тихо — напишите первым!</p>
        ) : (
          items.map((m) => (
            <div key={m.id} className="flex gap-2.5">
              <button onClick={() => openMember(m.user.id)} className="flex-shrink-0 mt-0.5">
                <MemberIcon name={m.user.name} level={m.user.level} avatar={m.user.avatar} className="w-8 h-8 text-xs" iconSize={15} />
              </button>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <button onClick={() => openMember(m.user.id)} className={`text-sm font-medium hover:underline ${nameCls(m.user.level, "text-white")}`}>
                    {m.user.name}
                  </button>
                  {m.user.isAi && <BotBadge ai compact className="self-center" />}
                  <SupporterBadge no={m.user.supporter} creator={m.user.creator} compact className="self-center" />
                  <span className={`text-[9px] ${levelInfo(m.user.level).text}`}>{levelInfo(m.user.level).title}</span>
                  <span className="text-muted-foreground text-[10px] font-mono">{time(m.createdAt)}</span>
                </div>
                <p className="text-foreground text-sm whitespace-pre-wrap break-words">{m.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-2 flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Сообщение… (Enter — отправить, Shift+Enter — новая строка)"
          maxLength={1000}
          rows={1}
          className="min-h-[40px] max-h-32 resize-none bg-background"
        />
        <Button onClick={send} disabled={!text.trim() || sending} className="h-10 w-10 p-0 flex-shrink-0" aria-label="Отправить">
          <Icon name="Send" size={16} />
        </Button>
      </div>
    </div>
  );
};

const ChatChannel = ({ room }: { room: ChatRoom }) => {
  const { user, setAuthOpen } = useAuth();
  const meta = CHAT_ROOMS.find((r) => r.id === room)!;

  if (!user)
    return (
      <Locked
        icon="LogIn"
        title={`${meta.name} — только для участников`}
        text="Войдите в аккаунт, чтобы читать и писать сообщения."
        action={<Button onClick={() => setAuthOpen(true)}>Войти</Button>}
      />
    );
  if (room === "premium" && !user.supporter && !user.creator && !user.isAdmin)
    return (
      <Locked
        icon="Crown"
        title="Премиум-чат — для тех, кто поддержал проект"
        text="Поддержите проект любой суммой — получите доступ в этот чат, значок «Поддержал проект» и личный промокод."
        action={<DonateButton />}
      />
    );
  if (room !== "premium" && (user.level ?? 1) < CHAT_MIN_LEVEL && !user.isAdmin)
    return (
      <Locked
        icon="Sprout"
        title="Чат откроется со статуса «Наблюдатель»"
        text="Заходите на сайт каждый день, заполните профиль и добавьте монеты в портфель — так вы быстрее наберёте очки и получите доступ."
      />
    );
  return <ChatRoomView key={room} room={room} />;
};

export default ChatChannel;
