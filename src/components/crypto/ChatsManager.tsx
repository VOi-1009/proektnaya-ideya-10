import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CHAT_COLORS, ChatMessage, chatColor, chatRequest } from "@/lib/chat";
import { LEVEL_NAMES } from "@/lib/forum";

interface AdminRoom {
  id: string;
  name: string;
  topic: string;
  color: string;
  access: "all" | "level" | "list";
  minLevel: number;
  sort: number;
  archived: boolean;
  members: number[];
  memberNames: { id: number; name: string }[];
  messages: number;
}

const EMPTY: AdminRoom = {
  id: "", name: "", topic: "", color: "sky", access: "level", minLevel: 3, sort: 10, archived: false, members: [], memberNames: [], messages: 0,
};

const ACCESS_LABELS: Record<string, string> = {
  all: "Все вошедшие участники",
  level: "От определённого статуса",
  list: "Только по списку (закрытый)",
};

const inputCls = "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const time = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const Messages = ({ token, room, onBack }: { token: string | null; room: AdminRoom; onBack: () => void }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["chat-admin-msgs", room.id, token],
    queryFn: () => chatRequest<{ items: ChatMessage[] }>(token, room.id),
  });
  const items = [...(data?.items ?? [])].reverse();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["chat-admin-msgs", room.id] });
    qc.invalidateQueries({ queryKey: ["chat-admin"] });
    qc.invalidateQueries({ queryKey: ["chat", room.id] });
  };

  const del = async (id: number) => {
    try {
      await chatRequest(token, room.id, "", { action: "msg-delete", id });
      refresh();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const clear = async () => {
    if (!window.confirm(`Удалить ВСЕ сообщения в чате «${room.name}»? Это нельзя отменить.`)) return;
    try {
      await chatRequest(token, room.id, "", { action: "room-clear", id: room.id });
      toast({ title: "Чат очищен" });
      refresh();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <button onClick={onBack} className="text-muted-foreground hover:text-white text-sm inline-flex items-center gap-1.5">
        <Icon name="ArrowLeft" size={15} /> К списку чатов
      </button>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-white">Сообщения: {room.name}</h2>
        <Button variant="ghost" onClick={clear} disabled={items.length === 0} className="text-down hover:bg-hover hover:text-down">
          <Icon name="Eraser" size={15} className="mr-1.5" /> Очистить чат
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Показаны последние 100 сообщений.</p>
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Загружаю…</p>}
        {!isLoading && items.length === 0 && <p className="p-4 text-sm text-muted-foreground">Сообщений нет</p>}
        {items.map((m) => (
          <div key={m.id} className="p-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-white text-sm font-medium">{m.user.name}</span>
                <span className="text-muted-foreground text-[10px] font-mono">#{m.user.id} · {time(m.createdAt)}</span>
              </div>
              <p className="text-foreground text-sm whitespace-pre-wrap break-words">{m.text}</p>
            </div>
            <button onClick={() => del(m.id)} className="text-muted-foreground hover:text-down flex-shrink-0" title="Удалить сообщение" aria-label="Удалить сообщение">
              <Icon name="Trash2" size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChatsManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["chat-admin", token];
  const { data } = useQuery({ queryKey: key, queryFn: () => chatRequest<{ rooms: AdminRoom[] }>(token, "", "&rooms=1&admin=1").then((d) => d.rooms) });
  const [f, setF] = useState<AdminRoom | null>(null);
  const [viewing, setViewing] = useState<AdminRoom | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: number; name: string }[]>([]);

  const done = () => {
    qc.invalidateQueries({ queryKey: ["chat-admin"] });
    qc.invalidateQueries({ queryKey: ["chat-rooms"] });
  };

  const save = async () => {
    if (!f) return;
    setSaving(true);
    try {
      await chatRequest(token, f.id, "", { action: "room-save", ...f });
      toast({ title: "Чат сохранён" });
      setF(null);
      done();
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const archive = async (r: AdminRoom) => {
    const hide = !r.archived;
    if (hide && !window.confirm(`Скрыть чат «${r.name}»? Сообщения сохранятся, чат пропадёт из меню.`)) return;
    try {
      await chatRequest(token, r.id, "", { action: "room-archive", id: r.id, archived: hide });
      toast({ title: hide ? "Чат скрыт" : "Чат возвращён" });
      done();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const search = async (v: string) => {
    setQ(v);
    if (v.trim().length < 1) return setFound([]);
    try {
      setFound((await chatRequest<{ users: { id: number; name: string }[] }>(token, "", `&find=${encodeURIComponent(v.trim())}`)).users);
    } catch {
      setFound([]);
    }
  };

  if (viewing) return <Messages token={token} room={viewing} onBack={() => setViewing(null)} />;

  if (f)
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl">
        <button onClick={() => setF(null)} className="text-muted-foreground hover:text-white text-sm inline-flex items-center gap-1.5">
          <Icon name="ArrowLeft" size={15} /> К списку чатов
        </button>
        <h2 className="font-display text-2xl text-white">{f.id ? "Редактирование чата" : "Новый чат"}</h2>
        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <input className={inputCls} value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Название чата" />
          <input className={inputCls} value={f.topic} maxLength={200} onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder="Описание (необязательно)" />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Цвет</span>
              <select className={inputCls} value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })}>
                {Object.entries(CHAT_COLORS).map(([id, c]) => (
                  <option key={id} value={id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Порядок (меньше — выше)</span>
              <input className={inputCls} value={f.sort} inputMode="numeric" onChange={(e) => setF({ ...f, sort: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) || 0 })} />
            </label>
          </div>
        </section>

        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Icon name="KeyRound" size={17} className="text-primary" /> Кто может входить
          </h3>
          <select className={inputCls} value={f.access} onChange={(e) => setF({ ...f, access: e.target.value as AdminRoom["access"] })}>
            {Object.entries(ACCESS_LABELS).map(([id, n]) => (
              <option key={id} value={id}>{n}</option>
            ))}
          </select>
          {f.access === "level" && (
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Минимальный статус</span>
              <select className={inputCls} value={f.minLevel} onChange={(e) => setF({ ...f, minLevel: Number(e.target.value) })}>
                {LEVEL_NAMES.slice(1, 11).map((n, i) => (
                  <option key={n} value={i + 1}>{i === 0 ? "Любой статус" : `от «${n}»`}</option>
                ))}
              </select>
            </label>
          )}
          <p className="text-xs text-muted-foreground">Администраторы заходят в любой чат независимо от настроек.</p>
        </section>

        {f.access === "list" && (
          <section className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Icon name="UserCheck" size={17} className="text-primary" /> Участники с доступом
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {f.members.map((id) => (
                <span key={id} className="inline-flex items-center gap-1.5 bg-primary/15 text-white text-xs rounded-full pl-2.5 pr-1.5 py-1">
                  {f.memberNames.find((n) => n.id === id)?.name ?? `#${id}`} <span className="font-mono text-muted-foreground">#{id}</span>
                  <button onClick={() => setF({ ...f, members: f.members.filter((x) => x !== id) })} className="hover:text-down" aria-label="Убрать">
                    <Icon name="X" size={12} />
                  </button>
                </span>
              ))}
              {f.members.length === 0 && <span className="text-xs text-muted-foreground">Список пуст — войти смогут только администраторы</span>}
            </div>
            <input className={inputCls} value={q} onChange={(e) => search(e.target.value)} placeholder="Найти участника по имени, почте или ID" />
            {found.length > 0 && (
              <div className="space-y-1">
                {found.filter((u) => !f.members.includes(u.id)).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setF({ ...f, members: [...f.members, u.id], memberNames: [...f.memberNames, u] });
                      setQ("");
                      setFound([]);
                    }}
                    className="w-full text-left flex items-center gap-2 bg-rail/60 hover:bg-hover rounded px-3 py-2 text-sm text-white"
                  >
                    <Icon name="Plus" size={14} /> {u.name} <span className="font-mono text-xs text-muted-foreground">#{u.id}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || f.name.trim().length < 2} className="font-semibold">
            {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
            Сохранить
          </Button>
          <Button variant="ghost" onClick={() => setF(null)} className="text-muted-foreground hover:text-white hover:bg-hover">
            Отмена
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-white">Чаты</h2>
        <Button onClick={() => setF({ ...EMPTY })} className="font-semibold">
          <Icon name="Plus" size={16} className="mr-1.5" /> Создать чат
        </Button>
      </div>
      <div className="space-y-2">
        {(data ?? []).map((r) => (
          <div key={r.id} className={`bg-card border border-border rounded-lg p-3 flex items-center gap-3 ${r.archived ? "opacity-60" : ""}`}>
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${chatColor(r.color).dot}`} />
            <div className="min-w-0 flex-1">
              <div className="text-white font-medium truncate flex items-center gap-2">
                {r.name}
                {r.archived && <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5">скрыт</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {r.access === "list" ? `Закрытый · участников: ${r.members.length}` : r.access === "all" ? "Для всех участников" : `От статуса «${LEVEL_NAMES[r.minLevel] ?? r.minLevel}»`}
                {" · "}сообщений: {r.messages}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setViewing(r)} className="text-muted-foreground hover:text-white hover:bg-hover" title="Сообщения">
              <Icon name="MessageSquare" size={15} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setF(r)} className="text-muted-foreground hover:text-white hover:bg-hover" title="Настройки">
              <Icon name="Settings" size={15} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => archive(r)} className="text-muted-foreground hover:text-down hover:bg-hover" title={r.archived ? "Вернуть" : "Скрыть"}>
              <Icon name={r.archived ? "Undo2" : "EyeOff"} size={15} />
            </Button>
          </div>
        ))}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">Чатов пока нет</p>}
      </div>
    </div>
  );
};

export default ChatsManager;
