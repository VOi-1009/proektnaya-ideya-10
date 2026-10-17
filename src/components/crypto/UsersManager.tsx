import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { LEVELS, nameCls } from "@/lib/status";
import { AdminUser, usersRequest } from "@/lib/users";
import StatusBadge from "./StatusBadge";
import UserAvatar from "./UserAvatar";
import MemberIcon from "./MemberIcon";
import UserCard from "./UserCard";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const ago = (iso: string | null) => {
  if (!iso) return "ещё не заходил";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 5) return "в сети";
  if (m < 60) return `${m} мин назад`;
  if (m < 1440) return `${Math.round(m / 60)} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
};

type BotForm = {
  id?: number;
  name: string;
  city: string;
  level: string;
  avatar?: string;
};
const EMPTY_BOT: BotForm = { name: "", city: "", level: "3" };

const UsersManager = ({
  token,
  myId,
}: {
  token: string | null;
  myId?: number;
}) => {
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
    queryFn: () =>
      usersRequest<{ users: AdminUser[] }>(token, "&admin=1").then(
        (d) => d.users,
      ),
  });

  const people = (data ?? []).filter((u) => !u.isBot);
  const card = (data ?? []).find((u) => u.id === cardId) ?? null;
  const patch = (user: AdminUser) =>
    qc.setQueryData<AdminUser[]>(key, (old) =>
      old?.map((x) => (x.id === user.id ? user : x)),
    );

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
    const src = (data ?? []).filter((u) =>
      view === "bots" ? u.isBot : !u.isBot,
    );
    const arr = src.filter(
      (u) =>
        !s ||
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s),
    );
    return arr.sort(
      (a, b) => b.level - a.level || a.name.localeCompare(b.name),
    );
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
      qc.setQueryData<AdminUser[]>(key, (old) =>
        old?.map((x) => (x.id === u.id ? { ...x, ...user } : x)),
      );
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
      qc.setQueryData<AdminUser[]>(key, (old) =>
        old?.filter((x) => x.id !== u.id),
      );
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
        bot.id
          ? old?.map((x) => (x.id === user.id ? user : x))
          : [user, ...(old ?? [])],
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
        view === id
          ? "bg-hover text-white font-semibold"
          : "text-muted-foreground hover:text-white"
      }`}
    >
      {label}{" "}
      <span className="text-muted-foreground font-mono text-xs">{count}</span>
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
          <Button
            onClick={() => setBot({ ...EMPTY_BOT })}
            className="font-semibold"
          >
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
          <Icon
            name="Search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className={`${inputCls} pl-9`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по имени или почте"
          />
        </div>
      </div>

      {bot && (
        <div className="bg-card border border-primary/50 rounded-lg p-4 space-y-3 animate-fade-in">
          <div className="text-white font-semibold flex items-center gap-2">
            <Icon name="Bot" size={18} className="text-primary" />
            {bot.id ? "Карточка бота" : "Новый бот"}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Имя (видно всем)
              </span>
              <input
                className={inputCls}
                value={bot.name}
                maxLength={60}
                onChange={(e) => setBot({ ...bot, name: e.target.value })}
                placeholder="Например, Алексей К."
                autoFocus
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Город (необязательно)
              </span>
              <input
                className={inputCls}
                value={bot.city}
                maxLength={100}
                onChange={(e) => setBot({ ...bot, city: e.target.value })}
                placeholder="Москва"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Статус</span>
              <select
                className={inputCls}
                value={bot.level}
                onChange={(e) => setBot({ ...bot, level: e.target.value })}
              >
                {LEVELS.map((l, i) => (
                  <option key={l.title} value={i + 1}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <UserAvatar
              name={bot.name || "Б"}
              avatar={bot.avatar}
              className="w-14 h-14 text-xl"
            />
            {bot.id ? (
              <div className="flex flex-wrap gap-2">
                <label
                  className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-input text-sm cursor-pointer hover:bg-hover hover:text-white ${
                    avatarBusy ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <Icon
                    name={avatarBusy ? "Loader2" : "Upload"}
                    size={14}
                    className={avatarBusy ? "animate-spin" : ""}
                  />
                  {bot.avatar ? "Заменить аватарку" : "Загрузить аватарку"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      botAvatar(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
                {bot.avatar && (
                  <button
                    onClick={removeBotAvatar}
                    disabled={avatarBusy}
                    className="text-xs text-muted-foreground hover:text-down"
                  >
                    Убрать
                  </button>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                Аватарку можно загрузить сразу после создания бота
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            У «Медведя» и «Быка» вместо аватарки всегда показывается красный или
            зелёный значок статуса.
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Так его увидят посетители:
            </span>
            <MemberIcon
              name={bot.name || "Б"}
              level={Number(bot.level)}
              avatar={bot.avatar}
            />
            <span
              className={`text-sm ${nameCls(Number(bot.level), "text-white")}`}
            >
              {bot.name || "Имя бота"}
            </span>
            <StatusBadge level={Number(bot.level)} compact />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={saveBot}
              disabled={saving}
              className="font-semibold"
            >
              {saving && (
                <Icon
                  name="Loader2"
                  size={16}
                  className="mr-1.5 animate-spin"
                />
              )}
              {bot.id ? "Сохранить" : "Создать"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setBot(null)}
              className="bg-transparent border-input hover:bg-hover hover:text-white"
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      {isLoading && <Skeleton className="h-40 w-full bg-card" />}
      {isError && (
        <div className="text-down text-sm">
          Не удалось загрузить пользователей.
        </div>
      )}

      <div className="space-y-2">
        {list.map((u) => {
          const online = u.isBot ? u.online : ago(u.lastSeen) === "в сети";
          return (
            <div
              key={u.id}
              className="bg-card border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <button
                onClick={() =>
                  u.isBot
                    ? setBot({
                        id: u.id,
                        name: u.name,
                        city: u.city,
                        level: String(u.level),
                        avatar: u.avatar,
                      })
                    : setCardId(u.id)
                }
                className="flex-1 min-w-0 flex items-center gap-3 text-left group"
                title={
                  u.isBot
                    ? "Открыть карточку бота"
                    : "Открыть карточку пользователя"
                }
              >
                <MemberIcon
                  name={u.name}
                  level={u.level}
                  avatar={u.avatar}
                  className="w-10 h-10 text-base"
                  iconSize={18}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {u.isBot && (
                      <Icon
                        name="Bot"
                        size={14}
                        className="text-muted-foreground flex-shrink-0"
                      />
                    )}
                    <span
                      className={`text-sm font-medium truncate group-hover:underline ${nameCls(u.level)}`}
                    >
                      {u.name}
                    </span>
                    <StatusBadge level={u.level} compact />
                    {u.id === myId && (
                      <span className="text-xs text-muted-foreground">
                        (вы)
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs flex flex-wrap gap-x-3">
                    {u.email && <span className="truncate">{u.email}</span>}
                    {u.isBot && u.city && <span>{u.city}</span>}
                    {!u.isBot && (
                      <span>
                        {u.points.toLocaleString("ru-RU")} очков
                        {u.bonus > 0 && (
                          <span className="text-primary">
                            {" "}
                            (+{u.bonus.toLocaleString("ru-RU")} в подарок)
                          </span>
                        )}
                      </span>
                    )}
                    <span className={online ? "text-up" : ""}>
                      {u.isBot
                        ? online
                          ? "сейчас в сети"
                          : "сейчас не в сети"
                        : ago(u.lastSeen)}
                    </span>
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-2">
                {busyId === u.id && (
                  <Icon
                    name="Loader2"
                    size={16}
                    className="animate-spin text-muted-foreground"
                  />
                )}
                {u.isBot ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setBot({
                        id: u.id,
                        name: u.name,
                        city: u.city,
                        level: String(u.level),
                        avatar: u.avatar,
                      })
                    }
                    className="bg-transparent border-input hover:bg-hover hover:text-white"
                  >
                    <Icon name="Pencil" size={14} className="mr-1.5" />
                    Изменить
                  </Button>
                ) : (
                  <select
                    className={`${inputCls} sm:w-48`}
                    disabled={busyId === u.id}
                    value={u.manual ? String(u.level) : "auto"}
                    onChange={(e) => setLevel(u, e.target.value)}
                  >
                    <option value="auto">Авто (по активности)</option>
                    {LEVELS.map((l, i) => (
                      <option key={l.title} value={i + 1}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                )}
                {!u.isBot && (
                  <button
                    onClick={() => setCardId(u.id)}
                    className="w-10 h-10 flex-shrink-0 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    aria-label="Подарить очки"
                    title="Карточка и очки активности"
                  >
                    <Icon name="Gift" size={16} />
                  </button>
                )}
                {u.id !== myId && !u.isAdmin && (
                  <button
                    onClick={() => setToDelete(u)}
                    disabled={busyId === u.id}
                    className="w-10 h-10 flex-shrink-0 rounded flex items-center justify-center text-muted-foreground hover:text-down hover:bg-down/10 transition-colors"
                    aria-label="Удалить"
                    title="Удалить"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {data && !list.length && (
          <div className="text-muted-foreground text-sm">
            {view === "bots" && !q
              ? "Ботов пока нет — нажмите «Создать бота»."
              : "Никого не нашлось."}
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

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Удалить «{toDelete?.name}»?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.isBot
                ? "Бот пропадёт из списка «В сети»."
                : "Аккаунт, портфель, оценки новостей и история посещений будут удалены без возможности восстановления. Статьи останутся на сайте."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-input hover:bg-hover hover:text-white">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-down text-white hover:bg-down/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersManager;
