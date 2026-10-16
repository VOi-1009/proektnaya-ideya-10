import { useState } from "react";
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
import { articlesRequest, Category, useCategories } from "@/lib/articles";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

interface Props {
  token: string | null;
  onChanged: () => void;
}

const CategoriesManager = ({ token, onChanged }: Props) => {
  const { data, isLoading } = useCategories();
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const run = async (body: object, ok: string) => {
    setBusy(true);
    try {
      await articlesRequest(token, "", body);
      toast({ title: ok });
      onChanged();
      return true;
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast({ title: "Название слишком короткое", variant: "destructive" });
    if (await run({ action: "category-save", name: name.trim() }, "Рубрика добавлена")) setName("");
  };

  const saveEdit = async (c: Category) => {
    if (editName.trim().length < 2) return toast({ title: "Название слишком короткое", variant: "destructive" });
    if (await run({ action: "category-save", id: c.id, name: editName.trim(), sort: c.sort }, "Рубрика переименована")) setEditId(null);
  };

  const move = (idx: number, dir: -1 | 1) => {
    if (!data) return;
    const a = data[idx];
    const b = data[idx + dir];
    if (!b) return;
    Promise.all([
      articlesRequest(token, "", { action: "category-save", id: a.id, name: a.name, sort: idx + dir }),
      articlesRequest(token, "", { action: "category-save", id: b.id, name: b.name, sort: idx }),
    ])
      .then(onChanged)
      .catch((e) => toast({ title: (e as Error).message, variant: "destructive" }));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Рубрики</h1>
        <p className="text-muted-foreground text-sm">Помогают читателям находить статьи по темам. Порядок здесь = порядок на сайте.</p>
      </div>

      <form onSubmit={add} className="bg-card border border-border rounded-lg p-3 flex gap-2">
        <input className={inputCls} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Название новой рубрики" />
        <Button type="submit" disabled={busy} className="font-semibold flex-shrink-0">
          <Icon name="Plus" size={16} className="mr-1.5" />
          Добавить
        </Button>
      </form>

      {isLoading && <Skeleton className="h-32 w-full bg-card" />}

      {data && !data.length && <div className="text-muted-foreground text-sm">Рубрик пока нет — добавьте первую.</div>}

      <div className="space-y-2">
        {data?.map((c, i) => (
          <div key={c.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-2">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-white disabled:opacity-20" aria-label="Выше">
                <Icon name="ChevronUp" size={16} />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === data.length - 1} className="text-muted-foreground hover:text-white disabled:opacity-20" aria-label="Ниже">
                <Icon name="ChevronDown" size={16} />
              </button>
            </div>
            {editId === c.id ? (
              <form
                className="flex-1 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEdit(c);
                }}
              >
                <input autoFocus className={inputCls} maxLength={60} value={editName} onChange={(e) => setEditName(e.target.value)} />
                <Button type="submit" size="sm" disabled={busy} className="h-10">
                  <Icon name="Check" size={16} />
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-10 text-muted-foreground hover:bg-hover" onClick={() => setEditId(null)}>
                  <Icon name="X" size={16} />
                </Button>
              </form>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{c.name}</div>
                  <div className="text-muted-foreground text-xs">Опубликовано статей: {c.count}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-white hover:bg-hover"
                  onClick={() => {
                    setEditId(c.id);
                    setEditName(c.name);
                  }}
                >
                  <Icon name="Pencil" size={16} />
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-down hover:bg-hover" onClick={() => setToDelete(c)}>
                  <Icon name="Trash2" size={16} />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Удалить рубрику «{toDelete?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>Статьи останутся на сайте, просто без рубрики.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-input text-foreground hover:bg-hover hover:text-white">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-down text-white hover:bg-down/90"
              onClick={() => {
                if (toDelete) run({ action: "category-delete", id: toDelete.id }, "Рубрика удалена");
                setToDelete(null);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesManager;
