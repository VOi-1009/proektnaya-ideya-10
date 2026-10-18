import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { useAuth } from "@/lib/auth";
import { Article, articlesRequest, fmtDate, useCategories } from "@/lib/articles";
import CategoriesManager from "@/components/crypto/CategoriesManager";
import PollsManager from "@/components/crypto/PollsManager";
import RadarsManager from "@/components/crypto/RadarsManager";
import SiteNewsManager from "@/components/crypto/SiteNewsManager";
import DonateManager from "@/components/crypto/DonateManager";
import AiBotManager from "@/components/crypto/AiBotManager";
import ChatsManager from "@/components/crypto/ChatsManager";
import ForumManager from "@/components/crypto/ForumManager";
import UsersManager from "@/components/crypto/UsersManager";
import BlocksManager from "@/components/crypto/BlocksManager";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const EMPTY = { title: "", summary: "", content: "", published: true, categoryId: "" };

const Admin = () => {
  const { user, token, ready, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [tab, setTab] = useState<"articles" | "categories" | "users" | "blocks" | "side" | "polls" | "radars" | "sitenews" | "donate" | "aibot" | "chats" | "forum">("articles");
  const { data: categories } = useCategories();
  const [form, setForm] = useState(EMPTY);
  const [cover, setCover] = useState<{ url: string; data?: string; type?: string }>({ url: "" });
  const [removeCover, setRemoveCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Article | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useQuery({
    queryKey: ["articles-admin", token],
    queryFn: () => articlesRequest<{ articles: Article[] }>(token, "&all=1").then((d) => d.articles),
    enabled: !!user?.isAdmin,
  });

  useEffect(() => {
    if (editing === null || editing === "new") return;
    articlesRequest<{ article: Article }>(token, `&id=${editing}`)
      .then(({ article: a }) => {
        setForm({
          title: a.title,
          summary: a.summary,
          content: a.content ?? "",
          published: a.published,
          categoryId: a.categoryId ? String(a.categoryId) : "",
        });
        setCover({ url: a.cover });
      })
      .catch((e) => toast({ title: (e as Error).message, variant: "destructive" }));
  }, [editing, token]);

  const startNew = () => {
    setForm(EMPTY);
    setCover({ url: "" });
    setRemoveCover(false);
    setEditing("new");
  };

  const startEdit = (id: number) => {
    setForm(EMPTY);
    setCover({ url: "" });
    setRemoveCover(false);
    setEditing(id);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type))
      return toast({ title: "Подойдёт JPG, PNG или WEBP", variant: "destructive" });
    if (f.size > 4 * 1024 * 1024) return toast({ title: "Обложка должна быть до 4 МБ", variant: "destructive" });
    const r = new FileReader();
    r.onload = () => {
      setCover({ url: String(r.result), data: String(r.result), type: f.type });
      setRemoveCover(false);
    };
    r.readAsDataURL(f);
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["articles-admin"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
    qc.invalidateQueries({ queryKey: ["article"] });
    qc.invalidateQueries({ queryKey: ["article-categories"] });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) return toast({ title: "Заголовок слишком короткий", variant: "destructive" });
    if (form.content.trim().length < 10) return toast({ title: "Добавьте текст статьи", variant: "destructive" });
    setSaving(true);
    try {
      await articlesRequest(token, "", {
        action: editing === "new" ? "create" : "update",
        id: editing === "new" ? undefined : editing,
        ...form,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        coverData: cover.data,
        coverType: cover.type,
        removeCover,
      });
      toast({ title: editing === "new" ? "Статья опубликована" : "Изменения сохранены" });
      setEditing(null);
      refresh();
    } catch (err) {
      toast({ title: "Не сохранилось", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await articlesRequest(token, "", { action: "delete", id: toDelete.id });
      toast({ title: "Статья удалена" });
      refresh();
    } catch (err) {
      toast({ title: "Не удалось удалить", description: (err as Error).message, variant: "destructive" });
    } finally {
      setToDelete(null);
    }
  };

  const header = (
    <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl sm:text-2xl leading-none">
          Т
        </div>
        <span className="font-display text-lg sm:text-xl text-white tracking-wide hidden sm:inline">
          TRADERKA<span className="text-primary">.RU</span>
        </span>
        <span className="text-xs uppercase tracking-wider bg-primary/15 text-primary rounded px-2 py-0.5">Админ</span>
      </Link>
      <Button variant="ghost" asChild className="text-muted-foreground hover:text-white hover:bg-hover">
        <Link to="/">
          <Icon name="ArrowLeft" size={16} className="mr-2" />
          На сайт
        </Link>
      </Button>
    </nav>
  );

  if (!ready) return <div className="min-h-screen bg-background" />;

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-background font-body">
        {header}
        <div className="max-w-md mx-auto mt-20 bg-card border border-border rounded-xl p-8 text-center">
          <Icon name="ShieldAlert" size={40} className="mx-auto text-primary mb-3" />
          <h1 className="font-display text-xl text-white mb-2">Админ-панель</h1>
          <p className="text-muted-foreground text-sm mb-5">
            {user ? "У вашего аккаунта нет доступа к этому разделу." : "Войдите под аккаунтом администратора."}
          </p>
          {!user && (
            <Button className="w-full font-semibold" onClick={() => setAuthOpen(true)}>
              Войти
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {header}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-5">
        {editing === null && (
          <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit max-w-full overflow-x-auto">
            {(
              [
                ["articles", "Статьи", "FileText"],
                ["categories", "Рубрики", "FolderTree"],
                ["blocks", "Блоки главной", "LayoutPanelLeft"],
                ["side", "Боковые блоки", "PanelRight"],
                ["users", "Пользователи", "Users"],
                ["polls", "Опросы", "ListChecks"],
                ["radars", "Радары", "Radar"],
                ["sitenews", "Новости сайта", "Megaphone"],
                ["donate", "Донаты", "Heart"],
                ["chats", "Чаты", "MessageCircle"],
                ["forum", "Форум", "MessagesSquare"],
                ["aibot", "AiTraderKa", "Sparkles"],
              ] as const
            ).map(([id, label, icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2 rounded-md text-sm inline-flex items-center gap-2 transition-colors ${
                  tab === id ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-white"
                }`}
              >
                <Icon name={icon} size={16} />
                {label}
              </button>
            ))}
          </div>
        )}
        {editing === null && tab === "blocks" ? (
          <BlocksManager key="main" token={token} placement="main" />
        ) : editing === null && tab === "side" ? (
          <BlocksManager key="side" token={token} placement="side" />
        ) : editing === null && tab === "radars" ? (
          <RadarsManager token={token} />
        ) : editing === null && tab === "sitenews" ? (
          <SiteNewsManager token={token} />
        ) : editing === null && tab === "chats" ? (
          <ChatsManager token={token} />
        ) : editing === null && tab === "forum" ? (
          <ForumManager token={token} />
        ) : editing === null && tab === "aibot" ? (
          <AiBotManager token={token} />
        ) : editing === null && tab === "donate" ? (
          <DonateManager token={token} />
        ) : editing === null && tab === "polls" ? (
          <PollsManager token={token} />
        ) : editing === null && tab === "users" ? (
          <UsersManager token={token} myId={user.id} />
        ) : editing === null && tab === "categories" ? (
          <CategoriesManager token={token} onChanged={refresh} />
        ) : editing === null ? (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-display text-2xl text-white">Статьи</h1>
                <p className="text-muted-foreground text-sm">Всего: {list.data?.length ?? 0}</p>
              </div>
              <Button onClick={startNew} className="font-semibold">
                <Icon name="Plus" size={16} className="mr-2" />
                Новая статья
              </Button>
            </div>

            {list.isLoading && <Skeleton className="h-40 w-full bg-card" />}

            {list.data && !list.data.length && (
              <div className="bg-card border border-border rounded-xl p-10 text-center">
                <Icon name="FilePlus2" size={36} className="mx-auto text-primary mb-3" />
                <div className="text-white font-semibold mb-1">Статей пока нет</div>
                <div className="text-muted-foreground text-sm mb-4">Напишите первую — она сразу появится в разделе «Статьи».</div>
                <Button onClick={startNew}>Написать статью</Button>
              </div>
            )}

            <div className="space-y-2">
              {list.data?.map((a) => (
                <div key={a.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                  {a.cover ? (
                    <img src={a.cover} alt="" className="w-16 h-12 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-12 rounded bg-rail flex items-center justify-center flex-shrink-0">
                      <Icon name="FileText" size={18} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{a.title}</div>
                    <div className="text-muted-foreground text-xs flex items-center gap-2 flex-wrap">
                      {a.category && <span className="text-primary">{a.category}</span>}
                      <span>{fmtDate(a.createdAt)}</span>
                      <span className={a.published ? "text-up" : "text-muted-foreground"}>
                        {a.published ? "Опубликована" : "Черновик"}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white hover:bg-hover" onClick={() => startEdit(a.id)}>
                    <Icon name="Pencil" size={16} />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-down hover:bg-hover" onClick={() => setToDelete(a)}>
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={save} className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-display text-xl text-white">{editing === "new" ? "Новая статья" : "Редактирование"}</h1>
              <button type="button" onClick={() => setEditing(null)} className="text-muted-foreground hover:text-white text-sm inline-flex items-center gap-1">
                <Icon name="X" size={16} /> Отмена
              </button>
            </div>

            <div>
              <span className="text-xs text-muted-foreground mb-1 block">Обложка</span>
              {cover.url ? (
                <div className="relative">
                  <img src={cover.url} alt="" className="w-full h-48 sm:h-64 object-cover rounded-lg" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                      Заменить
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setCover({ url: "" });
                        setRemoveCover(true);
                      }}
                    >
                      Убрать
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-input rounded-lg text-muted-foreground hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-1 text-sm"
                >
                  <Icon name="ImagePlus" size={24} />
                  Загрузить картинку (необязательно)
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
            </div>

            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Заголовок</span>
              <input className={inputCls} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="О чём статья" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Рубрика</span>
              <select className={inputCls} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Без рубрики</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => { setEditing(null); setTab("categories"); }} className="text-xs text-primary hover:underline mt-1">
                Управлять рубриками
              </button>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 flex justify-between">
                <span>Краткое описание</span>
                <span>{form.summary.length}/500</span>
              </span>
              <textarea
                className={`${inputCls} h-20 py-2 resize-none`}
                maxLength={500}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Пара предложений для карточки в списке"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Текст статьи</span>
              <textarea
                className={`${inputCls} h-80 py-2 leading-relaxed`}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Пишите обычным текстом, абзацы разделяйте пустой строкой"
              />
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              <span className="text-sm text-white">{form.published ? "Опубликовать на сайте" : "Сохранить как черновик"}</span>
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="font-semibold">
                {saving && <Icon name="Loader2" size={16} className="mr-2 animate-spin" />}
                Сохранить
              </Button>
              <Button type="button" variant="outline" className="bg-transparent border-input text-foreground hover:bg-hover hover:text-white" onClick={() => setEditing(null)}>
                Отмена
              </Button>
            </div>
          </form>
        )}
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Удалить статью?</AlertDialogTitle>
            <AlertDialogDescription>«{toDelete?.title}» пропадёт с сайта навсегда.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-input text-foreground hover:bg-hover hover:text-white">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-down text-white hover:bg-down/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
