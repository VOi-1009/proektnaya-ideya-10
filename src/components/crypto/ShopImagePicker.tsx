import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";

export interface PickedImage {
  data: string;
  type: string;
  preview: string;
}

const MAX_SIDE = 256;

const readFile = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("read"));
    r.readAsDataURL(file);
  });

const shrink = (src: string) =>
  new Promise<{ url: string; type: string }>((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      res({ url: c.toDataURL("image/png"), type: "image/png" });
    };
    img.onerror = () => rej(new Error("img"));
    img.src = src;
  });

interface Props {
  current?: string;
  emoji?: string;
  picked: PickedImage | null;
  removed?: boolean;
  onPick: (v: PickedImage | null) => void;
  onRemove?: () => void;
  size?: number;
}

const ShopImagePicker = ({ current, emoji, picked, removed, onPick, onRemove, size = 44 }: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const shown = picked?.preview ?? (removed ? "" : current);

  const choose = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      toast({ title: "Подойдёт PNG, JPG, WEBP или GIF", variant: "destructive" });
      return;
    }
    try {
      const raw = await readFile(file);
      if (file.type === "image/gif" && file.size <= 1024 * 1024) {
        onPick({ data: raw, type: file.type, preview: raw });
        return;
      }
      const s = await shrink(raw);
      onPick({ data: s.url, type: s.type, preview: s.url });
    } catch {
      toast({ title: "Не удалось прочитать картинку", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title="Выбрать картинку"
        className="rounded-lg border border-dashed border-border bg-rail hover:border-primary flex items-center justify-center overflow-hidden text-muted-foreground hover:text-white transition-colors"
        style={{ width: size, height: size }}
      >
        {shown ? <img src={shown} alt="" className="w-full h-full object-contain" /> : emoji ? <span className="text-2xl leading-none">{emoji}</span> : <Icon name="ImagePlus" size={18} />}
      </button>
      {(picked || (current && !removed)) && (
        <button
          type="button"
          title="Убрать картинку"
          onClick={() => (picked ? onPick(null) : onRemove?.())}
          className="text-muted-foreground hover:text-destructive"
        >
          <Icon name="X" size={14} />
        </button>
      )}
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
};

export default ShopImagePicker;
