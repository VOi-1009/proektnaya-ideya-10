import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
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
import { Article, articlesRequest, useCategories } from "@/lib/articles";
import CategoriesManager from "@/components/crypto/CategoriesManager";
import PollsManager from "@/components/crypto/PollsManager";
import RadarsManager from "@/components/crypto/RadarsManager";
import SiteNewsManager from "@/components/crypto/SiteNewsManager";
import QuotesManager from "@/components/crypto/QuotesManager";
import DonateManager from "@/components/crypto/DonateManager";
import MenuManager from "@/components/crypto/MenuManager";
import AiBotManager from "@/components/crypto/AiBotManager";
import ChatsManager from "@/components/crypto/ChatsManager";
import VisitsManager from "@/components/crypto/VisitsManager";
import ForumManager from "@/components/crypto/ForumManager";
import UsersManager from "@/components/crypto/UsersManager";
import BlocksManager from "@/components/crypto/BlocksManager";
import FundManager from "@/components/crypto/FundManager";
import ContestsManager from "@/components/crypto/ContestsManager";
import ExchangeManager from "@/components/crypto/ExchangeManager";
import ShopManager from "@/components/crypto/ShopManager";
import GamesManager from "@/components/crypto/GamesManager";
import MobileManager from "@/components/crypto/MobileManager";
import PushManager from "@/components/crypto/PushManager";
import ReferralManager from "@/components/crypto/ReferralManager";
import TournamentsManager from "@/components/crypto/TournamentsManager";
import ListingManager from "@/components/crypto/ListingManager";
import GraphicsManager from "@/components/crypto/GraphicsManager";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminSidebar, AdminTab, TabSwitcher } from "@/components/admin/AdminTabs";
import ArticlesList from "@/components/admin/ArticlesList";
import ArticleEditor from "@/components/admin/ArticleEditor";

const EMPTY = { title: "", summary: "", content: "", published: true, categoryId: "" };

const Admin = () => {
  const { user, token, ready, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [tab, setTab] = useState<AdminTab>("articles");
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

  if (!ready)
    return (
      <div className="min-h-screen bg-background font-body">
        <AdminHeader />
      </div>
    );

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-background font-body">
        <AdminHeader />
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

  const blocksSwitch = (
    <TabSwitcher
      wrap
      tab={tab}
      setTab={setTab}
      items={[["blocks", "Блоки главной", "LayoutPanelLeft"], ["side", "Боковые блоки", "PanelRight"], ["menu", "Меню слева", "PanelLeft"]]}
    />
  );

  const artSwitch = (
    <TabSwitcher tab={tab} setTab={setTab} items={[["articles", "Статьи", "FileText"], ["categories", "Рубрики", "FolderTree"]]} />
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <AdminHeader />
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        <div className={editing === null ? "flex flex-col lg:flex-row gap-5 lg:gap-6 lg:items-start" : ""}>
        {editing === null && <AdminSidebar tab={tab} setTab={setTab} />}
        <div className="flex-1 min-w-0 space-y-5">
        {editing === null && tab === "blocks" ? (
          <>
            {blocksSwitch}
            <BlocksManager key="main" token={token} placement="main" />
          </>
        ) : editing === null && tab === "side" ? (
          <>
            {blocksSwitch}
            <BlocksManager key="side" token={token} placement="side" />
          </>
        ) : editing === null && tab === "radars" ? (
          <RadarsManager token={token} />
        ) : editing === null && tab === "quotes" ? (
          <QuotesManager token={token} />
        ) : editing === null && tab === "sitenews" ? (
          <SiteNewsManager token={token} />
        ) : editing === null && tab === "chats" ? (
          <ChatsManager token={token} />
        ) : editing === null && tab === "visits" ? (
          <VisitsManager token={token} />
        ) : editing === null && tab === "forum" ? (
          <ForumManager token={token} />
        ) : editing === null && tab === "aibot" ? (
          <AiBotManager token={token} />
        ) : editing === null && tab === "push" ? (
          <PushManager token={token} />
        ) : editing === null && tab === "referral" ? (
          <ReferralManager token={token} />
        ) : editing === null && tab === "tournaments" ? (
          <TournamentsManager token={token} />
        ) : editing === null && tab === "listing" ? (
          <ListingManager token={token} />
        ) : editing === null && tab === "menu" ? (
          <>
            {blocksSwitch}
            <MenuManager token={token} />
          </>
        ) : editing === null && tab === "graphics" ? (
          <GraphicsManager token={token} />
        ) : editing === null && tab === "mobile" ? (
          <MobileManager token={token} />
        ) : editing === null && tab === "games" ? (
          <GamesManager token={token} />
        ) : editing === null && tab === "shop" ? (
          <ShopManager token={token} />
        ) : editing === null && tab === "exchange" ? (
          <ExchangeManager token={token} />
        ) : editing === null && tab === "contests" ? (
          <ContestsManager token={token} />
        ) : editing === null && tab === "fund" ? (
          <FundManager token={token} />
        ) : editing === null && tab === "donate" ? (
          <DonateManager token={token} />
        ) : editing === null && tab === "polls" ? (
          <PollsManager token={token} />
        ) : editing === null && tab === "users" ? (
          <UsersManager token={token} myId={user.id} />
        ) : editing === null && tab === "categories" ? (
          <>
            {artSwitch}
            <CategoriesManager token={token} onChanged={refresh} />
          </>
        ) : editing === null ? (
          <ArticlesList list={list} artSwitch={artSwitch} startNew={startNew} startEdit={startEdit} setToDelete={setToDelete} />
        ) : (
          <ArticleEditor
            editing={editing}
            setEditing={setEditing}
            setTab={setTab}
            form={form}
            setForm={setForm}
            cover={cover}
            setCover={setCover}
            setRemoveCover={setRemoveCover}
            categories={categories}
            fileRef={fileRef}
            onFile={onFile}
            save={save}
            saving={saving}
          />
        )}
        </div>
        </div>
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
