import type { RefObject } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { useCategories } from "@/lib/articles";
import type { AdminTab } from "./AdminTabs";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

export interface ArticleForm {
  title: string;
  summary: string;
  content: string;
  published: boolean;
  categoryId: string;
}

export interface ArticleCover {
  url: string;
  data?: string;
  type?: string;
}

interface Props {
  editing: number | "new" | null;
  setEditing: (v: number | "new" | null) => void;
  setTab: (t: AdminTab) => void;
  form: ArticleForm;
  setForm: (f: ArticleForm) => void;
  cover: ArticleCover;
  setCover: (c: ArticleCover) => void;
  setRemoveCover: (v: boolean) => void;
  categories: ReturnType<typeof useCategories>["data"];
  fileRef: RefObject<HTMLInputElement | null>;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  save: (e: React.FormEvent) => void;
  saving: boolean;
}

const ArticleEditor = ({ editing, setEditing, setTab, form, setForm, cover, setCover, setRemoveCover, categories, fileRef, onFile, save, saving }: Props) => (
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
);

export default ArticleEditor;
