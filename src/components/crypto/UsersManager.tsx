import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { AdminUser, usersRequest } from "@/lib/users";
import UserCard from "./UserCard";
import BotEditor from "./BotEditor";
import UserRow from "./UserRow";
import DeleteUserDialog from "./DeleteUserDialog";
import { BotForm, EMPTY_BOT, inputCls } from "./usersAdmin";

const UsersManager = ({ token, myId }: { token: string | null; myId?: number }) => {
  const qc = useQueryClient();
  const key = ["admin-users", token];
  const [q, setQ] = useState("");
  const [view, setView] = useState<"people" | "bots">("people");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [bot, setBot] = useState<BotForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [cardId, setCardId] = useState<number | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => usersRequest<{ users: AdminUser[] }>(token, "&admin=1").then((d) => d.users),
  });

  const people = (data ?? []).filter((u) => !u.isBot);
  const card = (data ?? []).find((u) => u.id === cardId) ?? null;
  const patch = (user: AdminUser) => qc.setQueryData<AdminUser[]>(key, (old) => old?.map((x) => (x.id === user.id ? user : x)));

  const botAvatar = (file: File | null) => {
    if (!file || !bot?.id) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return toast({
        title: "Подойдёт JPG, PNG или WEBP",
        variant: "destructive",
      });
    if (file.size > 3 * 1024 * 1024)
      return toast({
        title: "Картинка должна быть до 3 МБ",
        variant: "destructive",
      });
    const id = bot.id;
    const reader = new FileReader();
    reader.onload = async () => {
      setAvatarBusy(true);
      try {
        const { user } = await usersRequest<{ user: AdminUser }>(token, "", {
          action: "bot-avatar",
          userId: id,
          contentType: file.type,
          data: reader.result,
        });
        patch(user);
        setBot((b) => (b && b.id === id ? { ...b, avatar: user.avatar } : b));
        refreshOnline();
        toast({ title: "Аватарка загружена" });
      } catch (e) {
        toast({
          title: "Не удалось загрузить",
          description: (e as Error).message,
          variant: "destructive",
        });
      } finally {
        setAvatarBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeBotAvatar = async () => {
    if (!bot?.id) return;
    setAvatarBusy(true);
    try {
      const { user } = await usersRequest<{ user: AdminUser }>(token, "", {
        action: "remove-bot-avatar",
        userId: bot.id,
      });
      patch(user);
      setBot((b) => (b ? { ...b, avatar: "" } : b));
      refreshOnline();
    } catch (e) {
      toast({
        title: "Не получилось",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setAvatarBusy(false);
    }
  };
  const bots = (data ?? []).filter((u) => u.isBot);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const src = (data ?? []).filter((u) => (view === "bots" ? u.isBot : !u.isBot));
    const arr = src.filter((u) => !s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    return arr.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  }, [data, q, view]);

  const refreshOnline = () => qc.invalidateQueries({ queryKey: ["online"] });

  const setLevel = async (u: AdminUser, value: string) => {
    setBusyId(u.id);
    try {
      const { user } = await usersRequest<{ user: AdminUser }>(token, "", {
        action: "set-status",
        userId: u.id,
        level: value === "auto" ? null : Number(value),
      });
      qc.setQueryData<AdminUser[]>(key, (old) => old?.map((x) => (x.id === u.id ? { ...x, ...user } : x)));
      refreshOnline();
      toast({ title: `${user.name}: статус «${user.title}»` });
    } catch (e) {
      toast({
        title: "Не получилось",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    const u = toDelete;
    if (!u) return;
    setToDelete(null);
    setBusyId(u.id);
    try {
      await usersRequest(token, "", { action: "delete-user", userId: u.id });
      qc.setQueryData<AdminUser[]>(key, (old) => old?.filter((x) => x.id !== u.id));
      refreshOnline();
      toast({
        title: `${u.isBot ? "Бот" : "Пользователь"} «${u.name}» удалён`,
      });
    } catch (e) {
      toast({
        title: "Не получилось удалить",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const saveBot = async () => {
    if (!bot) return;
    if (bot.name.trim().length < 2) {
      toast({
        title: "Укажите имя бота — минимум 2 символа",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { user } = await usersRequest<{ user: AdminUser }>(token, "", {
        action: bot.id ? "update-bot" : "create-bot",
        userId: bot.id,
        name: bot.name.trim(),
        city: bot.city.trim(),
        level: Number(bot.level),
      });
      qc.setQueryData<AdminUser[]>(key, (old) =>
        bot.id ? old?.map((x) => (x.id === user.id ? user : x)) : [user, ...(old ?? [])],
      );
      refreshOnline();
      if (bot.id) {
        toast({ title: "Бот обновлён", description: `Статус: ${user.title}` });
        setBot(null);
      } else {
        toast({
          title: `Бот «${user.name}» создан`,
          description: "Теперь можно загрузить ему аватарку",
        });
        setBot({
          id: user.id,
          name: user.name,
          city: user.city,
          level: String(user.level),
          avatar: "",
        });
      }
    } catch (e) {
      toast({
        title: "Не получилось сохранить",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const tab = (id: "people" | "bots", label: string, count: number) => (
    <button
      onClick={() => setView(id)}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
        view === id ? "bg-hover text-white font-semibold" : "text-muted-foreground hover:text-white"
      }`}
    >
      {label} <span className="text-muted-foreground font-mono text-xs">{count}</span>
    </button>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white">Пользователи</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            {view === "bots"
              ? "Боты сами заходят в сеть и уходят каждые 15 минут. Посетители видят у них только тот статус, что вы назначили."
              : "«Авто» — статус считается по активности, остальные варианты закрепляют его вручную."}
          </p>
        </div>
        {view === "bots" && (
          <Button onClick={() => setBot({ ...EMPTY_BOT })} className="font-semibold">
            <Icon name="Plus" size={16} className="mr-1.5" />
            Создать бота
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {tab("people", "Люди", people.length)}
          {tab("bots", "Боты", bots.length)}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени или почте" />
        </div>
      </div>

      {bot && (
        <BotEditor
          bot={bot}
          setBot={setBot}
          saving={saving}
          avatarBusy={avatarBusy}
          onSave={saveBot}
          onAvatar={botAvatar}
          onRemoveAvatar={removeBotAvatar}
        />
      )}

      {isLoading && <Skeleton className="h-40 w-full bg-card" />}
      {isError && <div className="text-down text-sm">Не удалось загрузить пользователей.</div>}

      <div className="space-y-2">
        {list.map((u) => (
          <UserRow
            key={u.id}
            u={u}
            myId={myId}
            busyId={busyId}
            setBot={setBot}
            setCardId={setCardId}
            setLevel={setLevel}
            setToDelete={setToDelete}
          />
        ))}
        {data && !list.length && (
          <div className="text-muted-foreground text-sm">
            {view === "bots" && !q ? "Ботов пока нет — нажмите «Создать бота»." : "Никого не нашлось."}
          </div>
        )}
      </div>

      <UserCard
        user={card}
        token={token}
        isMe={card?.id === myId}
        onClose={() => setCardId(null)}
        onChange={(user) => {
          patch(user);
          refreshOnline();
          qc.invalidateQueries({ queryKey: ["rating"] });
        }}
        onStatus={setLevel}
        onDelete={(user) => {
          setCardId(null);
          setToDelete(user);
        }}
      />

      <DeleteUserDialog toDelete={toDelete} onCancel={() => setToDelete(null)} onConfirm={remove} />
    </div>
  );
};

export default UsersManager;
