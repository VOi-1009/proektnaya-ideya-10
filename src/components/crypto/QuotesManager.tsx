import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { BookQuote, quotesRequest } from "@/lib/quotes";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

type Form = { id?: number; quote: string; book: string; author: string; published: boolean };

const QuotesManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["admin-book-quotes", token];
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => quotesRequest<{ items: BookQuote[] }>(token, "&admin=1").then((d) => d.items),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["book-quotes"] });
    qc.invalidateQueries({ queryKey: key });
  };

  const save = async (f: Form) => {
    setSaving(true);
    try {
      await quotesRequest(token, "", { action: "save", ...f });
      refresh();
      toast({ title: f.id ? "Цитата сохранена" : "Цитата добавлена" });
      setForm(null);
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (q: BookQuote) => {
    if (!window.confirm("Удалить эту цитату?")) return;
    try {
      await quotesRequest(token, "", { action: "delete", id: q.id });
      refresh();
      toast({ title: "Цитата удалена" });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    }
  };

  const list = data ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white">Цитаты из книг</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Добавляйте цитаты с указанием книги и автора. Скрытые цитаты на сайте не показываются.</p>
        </div>
        {!form && (
          <Button onClick={() => setForm({ quote: "", book: "", author: "", published: true })} className="font-semibold">
            <Icon name="Plus" size={16} className="mr-1.5" />
            Новая цитата
          </Button>
        )}
      </div>

      {form && (
        <div className="bg-card border border-primary/50 rounded-lg p-4 space-y-3 animate-fade-in">
          <div className="text-white font-semibold">{form.id ? "Редактирование цитаты" : "Новая цитата"}</div>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Цитата</span>
            <textarea
              className={`${inputCls} h-28 py-2 resize-y`}
              value={form.quote}
              maxLength={1000}
              autoFocus
              onChange={(e) => setForm({ ...form, quote: e.target.value })}
              placeholder="Текст цитаты"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Книга</span>
              <input
                className={inputCls}
                value={form.book}
                maxLength={200}
                onChange={(e) => setForm({ ...form, book: e.target.value })}
                placeholder="Название книги"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Автор</span>
              <input
                className={inputCls}
                value={form.author}
                maxLength={150}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Имя автора"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            Показывать на сайте
          </label>
          <div className="flex gap-2">
            <Button onClick={() => save(form)} disabled={saving || form.quote.trim().length < 5} className="font-semibold">
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
        <div className="text-down text-sm">Не удалось загрузить цитаты</div>
      ) : list.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">Цитат пока нет</div>
      ) : (
        <div className="space-y-2">
          {list.map((q) => (
            <div key={q.id} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm italic whitespace-pre-line line-clamp-3">«{q.quote}»</p>
                <div className="text-muted-foreground text-xs mt-1 flex items-center gap-2 flex-wrap">
                  <span>{[q.author, q.book].filter(Boolean).join(" — ") || "Без источника"}</span>
                  {!q.published && <span className="text-[9px] uppercase bg-rail text-muted-foreground rounded px-1.5 py-0.5">скрыта</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Switch
                  checked={q.published}
                  onCheckedChange={(v) => save({ id: q.id, quote: q.quote, book: q.book, author: q.author, published: v })}
                  title="Показывать на сайте"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-muted-foreground hover:text-white hover:bg-hover"
                  onClick={() => setForm({ id: q.id, quote: q.quote, book: q.book, author: q.author, published: q.published })}
                  title="Редактировать"
                >
                  <Icon name="Pencil" size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-muted-foreground hover:text-down hover:bg-hover"
                  onClick={() => remove(q)}
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

export default QuotesManager;
