import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { SiteNews, siteNewsRequest } from "@/lib/siteNews";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

type Form = { id?: number; title: string; body: string; published: boolean };

const SiteNewsManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["admin-site-news", token];
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => siteNewsRequest<{ items: SiteNews[] }>(token, "&admin=1").then((d) => d.items),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["site-news"] });
    qc.invalidateQueries({ queryKey: key });
  };

  const save = async (f: Form) => {
    setSaving(true);
    try {
      await siteNewsRequest(token, "", { action: "save", ...f });
      refresh();
      toast({ title: f.id ? "Новость сохранена" : "Новость опубликована" });
      setForm(null);
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (n: SiteNews) => {
    if (!window.confirm(`Удалить новость «${n.title}»?`)) return;
    try {
      await siteNewsRequest(token, "", { action: "delete", id: n.id });
      refresh();
      toast({ title: "Новость удалена" });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    }
  };

  const list = data ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white">Новости сайта</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Блок в левом меню под разделами. На сайте видны 3 последние опубликованные записи.
          </p>
        </div>
        {!form && (
          <Button onClick={() => setForm({ title: "", body: "", published: true })} className="font-semibold">
            <Icon name="Plus" size={16} className="mr-1.5" />
            Новая запись
          </Button>
        )}
      </div>

      {form && (
        <div className="bg-card border border-primary/50 rounded-lg p-4 space-y-3 animate-fade-in">
          <div className="text-white font-semibold">{form.id ? "Редактирование записи" : "Новая запись"}</div>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Заголовок</span>
            <input
              className={inputCls}
              value={form.title}
              maxLength={150}
              autoFocus
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Что нового на сайте"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Текст</span>
            <textarea
              className={`${inputCls} h-28 py-2 resize-y`}
              value={form.body}
              maxLength={2000}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Пара предложений для участников"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            Показывать на сайте
          </label>
          {form.title.trim() && (
            <div className="rounded-lg bg-rail/60 px-3 py-2 max-w-xs">
              <div className="text-sky-400 text-sm font-semibold leading-snug">{form.title}</div>
              {form.body && <p className="text-muted-foreground text-xs mt-1 whitespace-pre-line">{form.body}</p>}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={() => save(form)} disabled={saving || form.title.trim().length < 2} className="font-semibold">
              {saving ? <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" /> : <Icon name="Check" size={16} className="mr-1.5" />}
              Сохранить
            </Button>
            <Button variant="ghost" onClick={() => setForm(null)} className="text-muted-foreground hover:text-white hover:bg-hover">
              Отмена
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 w-full bg-card" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-down text-sm">Не удалось загрузить новости</div>
      ) : list.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">Записей пока нет</div>
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <div key={n.id} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sky-400 font-semibold text-sm">{n.title}</span>
                  {!n.published && <span className="text-[10px] uppercase bg-rail text-muted-foreground rounded px-1.5 py-0.5">скрыта</span>}
                </div>
                {n.body && <p className="text-muted-foreground text-xs mt-1 line-clamp-2 whitespace-pre-line">{n.body}</p>}
                <div className="text-muted-foreground/70 text-[11px] font-mono mt-1">{new Date(n.createdAt).toLocaleString("ru-RU")}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Switch
                  checked={n.published}
                  onCheckedChange={(v) => save({ id: n.id, title: n.title, body: n.body, published: v })}
                  title="Показывать на сайте"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-muted-foreground hover:text-white hover:bg-hover"
                  onClick={() => setForm({ id: n.id, title: n.title, body: n.body, published: n.published })}
                  title="Редактировать"
                >
                  <Icon name="Pencil" size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-muted-foreground hover:text-down hover:bg-hover"
                  onClick={() => remove(n)}
                  title="Удалить"
                >
                  <Icon name="Trash2" size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteNewsManager;
