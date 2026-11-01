import type { ReactNode } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Article, fmtDate } from "@/lib/articles";

interface Props {
  list: { data?: Article[]; isLoading: boolean };
  artSwitch: ReactNode;
  startNew: () => void;
  startEdit: (id: number) => void;
  setToDelete: (a: Article | null) => void;
}

const ArticlesList = ({ list, artSwitch, startNew, startEdit, setToDelete }: Props) => (
  <>
    {artSwitch}
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
);

export default ArticlesList;
