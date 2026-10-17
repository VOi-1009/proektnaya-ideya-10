import { useRef, useState } from "react";
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
import { blocksRequest, HomeBlock } from "@/lib/blocks";
import { HomeBlockView } from "./HomeBlocks";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";
const areaCls =
  "w-full bg-rail rounded px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground min-h-[160px] resize-y";

interface Img {
  url: string;
  data?: string;
  type?: string;
  remove?: boolean;
}

interface Form {
  id: number;
  title: string;
  leftText: string;
  rightText: string;
  published: boolean;
  left: Img;
  right: Img;
}

const empty: Form = { id: 0, title: "", leftText: "", rightText: "", published: true, left: { url: "" }, right: { url: "" } };

const ImagePicker = ({ img, onChange }: { img: Img; onChange: (i: Img) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type))
      return toast({ title: "Подойдёт JPG, PNG или WEBP", variant: "destructive" });
    if (f.size > 4 * 1024 * 1024) return toast({ title: "Картинка должна быть до 4 МБ", variant: "destructive" });
    const r = new FileReader();
    r.onload = () => onChange({ url: String(r.result), data: String(r.result), type: f.type });
    r.readAsDataURL(f);
  };
  return (
    <div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
      {img.url ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={img.url} alt="" className="w-full h-40 object-cover" />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => ref.current?.click()}>
              <Icon name="RefreshCw" size={14} />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onChange({ url: "", remove: true })}>
              <Icon name="Trash2" size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="w-full h-40 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-white flex flex-col items-center justify-center gap-2 text-sm transition-colors"
        >
          <Icon name="ImagePlus" size={24} />
          Добавить картинку
        </button>
      )}
    </div>
  );
};

const BlocksManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["home-blocks-admin", token],
    queryFn: () => blocksRequest<{ blocks: HomeBlock[] }>(token, "&all=1").then((d) => d.blocks),
  });
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<HomeBlock | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["home-blocks-admin"] });
    qc.invalidateQueries({ queryKey: ["home-blocks"] });
  };

  const run = async (body: object, ok?: string) => {
    setBusy(true);
    try {
      await blocksRequest(token, "", body);
      if (ok) toast({ title: ok });
      refresh();
      return true;
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const edit = (b: HomeBlock) =>
    setForm({
      id: b.id,
      title: b.title,
      leftText: b.leftText,
      rightText: b.rightText,
      published: b.published,
      left: { url: b.leftImage },
      right: { url: b.rightImage },
    });

  const save = async () => {
    if (!form) return;
    const done = await run(
      {
        action: "save",
        id: form.id || undefined,
        title: form.title,
        leftText: form.leftText,
        rightText: form.rightText,
        published: form.published,
        leftImageData: form.left.data,
        leftImageType: form.left.type,
        leftImageRemove: form.left.remove,
        rightImageData: form.right.data,
        rightImageType: form.right.type,
        rightImageRemove: form.right.remove,
      },
      form.id ? "Блок обновлён" : "Блок добавлен на главную",
    );
    if (done) setForm(null);
  };

  if (form) {
    const preview: HomeBlock = {
      id: form.id,
      title: form.title,
      leftText: form.leftText,
      rightText: form.rightText,
      leftImage: form.left.url,
      rightImage: form.right.url,
      sort: 0,
      published: form.published,
    };
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg text-white">{form.id ? "Редактирование блока" : "Новый блок"}</h3>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              Показывать
            </label>
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Заголовок блока (необязательно)"
            className={inputCls}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["left", "right"] as const).map((side) => (
              <div key={side} className="space-y-3">
                <div className="text-xs font-mono text-primary uppercase">{side === "left" ? "Левая часть" : "Правая часть"}</div>
                <ImagePicker img={form[side]} onChange={(i) => setForm({ ...form, [side]: i })} />
                <textarea
                  value={side === "left" ? form.leftText : form.rightText}
                  onChange={(e) => setForm({ ...form, [side === "left" ? "leftText" : "rightText"]: e.target.value })}
                  placeholder="Текст"
                  className={areaCls}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy} className="font-semibold">
              <Icon name={busy ? "Loader2" : "Check"} size={16} className={`mr-2 ${busy ? "animate-spin" : ""}`} />
              Сохранить
            </Button>
            <Button variant="outline" onClick={() => setForm(null)} className="bg-transparent border-input text-foreground hover:bg-hover hover:text-white">
              Отмена
            </Button>
          </div>
        </div>
        <div className="text-xs font-mono text-muted-foreground">ПРЕДПРОСМОТР</div>
        <HomeBlockView block={preview} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setForm({ ...empty })} className="font-semibold">
        <Icon name="Plus" size={16} className="mr-2" />
        Новый блок
      </Button>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !data?.length ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
          Блоков пока нет. Создайте первый — он появится на главной странице.
        </div>
      ) : (
        data.map((b, i) => (
          <div key={b.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
            <div className="flex gap-1 flex-shrink-0">
              {[b.leftImage, b.rightImage].map((src, k) =>
                src ? (
                  <img key={k} src={src} alt="" className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div key={k} className="w-12 h-12 rounded bg-rail flex items-center justify-center text-muted-foreground">
                    <Icon name="AlignLeft" size={16} />
                  </div>
                ),
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{b.title || b.leftText || b.rightText || "Без названия"}</div>
              <div className="text-xs text-muted-foreground">{b.published ? "Показывается на главной" : "Скрыт"}</div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button size="icon" variant="ghost" disabled={busy || i === 0} onClick={() => run({ action: "move", id: b.id, dir: "up" })}>
                <Icon name="ArrowUp" size={16} />
              </Button>
              <Button size="icon" variant="ghost" disabled={busy || i === data.length - 1} onClick={() => run({ action: "move", id: b.id, dir: "down" })}>
                <Icon name="ArrowDown" size={16} />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => edit(b)}>
                <Icon name="Pencil" size={16} />
              </Button>
              <Button size="icon" variant="ghost" className="text-down hover:text-down" onClick={() => setToDelete(b)}>
                <Icon name="Trash2" size={16} />
              </Button>
            </div>
          </div>
        ))
      )}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить блок?</AlertDialogTitle>
            <AlertDialogDescription>Он исчезнет с главной страницы. Действие нельзя отменить.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) run({ action: "delete", id: toDelete.id }, "Блок удалён");
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

export default BlocksManager;
