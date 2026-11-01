import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { fundRequest } from "@/lib/fund";
import { CARD_DEFAULTS, CARD_LABELS, CardKey, GraphicsSettings, PALETTE } from "@/lib/graphics";
import { QUICK_EMOJI } from "@/lib/community";
import ShopImagePicker, { PickedImage } from "./ShopImagePicker";

type ImgKey = "logo" | "favicon" | "appIcon";

const FIELDS: { key: ImgKey; title: string; hint: string; fallback: string }[] = [
  { key: "logo", title: "Логотип", hint: "Квадратный значок в шапке сайта и в МВ. Лучше PNG с прозрачным фоном.", fallback: "/app-icons/icon-192.png" },
  { key: "favicon", title: "Favicon", hint: "Маленький значок во вкладке браузера. Квадрат, PNG или SVG.", fallback: "/favicon.svg" },
  { key: "appIcon", title: "Значок мобильного приложения", hint: "Иконка на экране телефона после установки. Квадрат от 512 пикселей, без прозрачности.", fallback: "/app-icons/icon-512.png" },
];

const GraphicsManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["graphics-admin", token],
    queryFn: async () => (await fundRequest<{ settings: GraphicsSettings }>(token, "?action=graphics_settings")).settings,
    enabled: !!token,
  });
  const [picked, setPicked] = useState<Partial<Record<ImgKey, PickedImage | null>>>({});
  const [removed, setRemoved] = useState<Partial<Record<ImgKey, boolean>>>({});
  const [emoji, setEmoji] = useState<string[] | null>(null);
  const [newEmoji, setNewEmoji] = useState("");
  const [cards, setCards] = useState<Record<CardKey, string> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !emoji) setEmoji(data.emoji);
    if (data && !cards) setCards({ ...CARD_DEFAULTS, ...data.cardColors });
  }, [data, emoji, cards]);

  if (!data || !emoji || !cards) return <p className="text-muted-foreground text-sm">Загружаю…</p>;

  const dirty = Object.values(picked).some(Boolean) || Object.values(removed).some(Boolean) || JSON.stringify(emoji) !== JSON.stringify(data.emoji) || JSON.stringify(cards) !== JSON.stringify({ ...CARD_DEFAULTS, ...data.cardColors });

  const save = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { action: "graphics_save", emoji, cardColors: cards };
      for (const f of FIELDS) {
        const p = picked[f.key];
        if (p) {
          body[`${f.key}Data`] = p.data;
          body[`${f.key}Type`] = p.type;
        } else if (removed[f.key]) body[`${f.key}Remove`] = true;
      }
      const r = await fundRequest<{ settings: GraphicsSettings }>(token, "", body);
      qc.setQueryData(["graphics-admin", token], r.settings);
      qc.setQueryData(["graphics-settings"], r.settings);
      setPicked({});
      setRemoved({});
      setEmoji(r.settings.emoji);
      setCards({ ...CARD_DEFAULTS, ...r.settings.cardColors });
      toast({ title: "Графика сохранена" });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const addEmoji = () => {
    const v = newEmoji.trim();
    if (!v || emoji.length >= 48) return;
    setEmoji([...emoji, ...Array.from(v.replace(/\s+/g, " ").split(" ")).filter((x) => x && !emoji.includes(x))]);
    setNewEmoji("");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Графика</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">Логотип, значки и набор смайлов сайта. Картинки до 1 МБ. Если ничего не выбрано, остаются стандартные.</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 divide-y divide-border">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <ShopImagePicker
              current={data[f.key] || f.fallback}
              picked={picked[f.key] ?? null}
              removed={!!removed[f.key]}
              size={64}
              maxSide={f.key === "appIcon" ? 512 : 256}
              onPick={(p) => { setPicked({ ...picked, [f.key]: p }); setRemoved({ ...removed, [f.key]: false }); }}
              onRemove={() => setRemoved({ ...removed, [f.key]: true })}
            />
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold">{f.title}</div>
              <p className="text-[11px] text-muted-foreground">{f.hint}</p>
              {data[f.key] && !removed[f.key] && !picked[f.key] && <p className="text-[11px] text-primary">Используется ваша картинка</p>}
              {removed[f.key] && <p className="text-[11px] text-muted-foreground">После сохранения вернётся стандартная</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Palette" size={15} className="text-primary" /> Цвета карточек «Рыночной сводки»</h2>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setCards({ ...CARD_DEFAULTS })}>Сбросить на стандартные</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Цветная полоска слева на каждой из 9 карточек, на сайте и в МВ. Выберите цвет из набора или задайте свой.</p>
        <div className="divide-y divide-border">
          {(Object.keys(CARD_LABELS) as CardKey[]).map((k) => (
            <div key={k} className="flex items-center gap-3 py-2 flex-wrap">
              <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ background: cards[k] }} />
              <div className="text-sm text-white w-48 flex-shrink-0">{CARD_LABELS[k]}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PALETTE.map((p) => (
                  <button
                    key={p.hex}
                    title={p.name}
                    onClick={() => setCards({ ...cards, [k]: p.hex })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${cards[k].toLowerCase() === p.hex.toLowerCase() ? "border-white" : "border-transparent"}`}
                    style={{ background: p.hex }}
                  />
                ))}
                <input type="color" title="Свой цвет" value={cards[k]} onChange={(e) => setCards({ ...cards, [k]: e.target.value.toUpperCase() })} className="w-7 h-7 rounded bg-rail border border-border cursor-pointer p-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Smile" size={15} className="text-primary" /> Смайлы в сообществе</h2>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setEmoji([...QUICK_EMOJI])}>Сбросить на стандартные</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Этот набор участники видят в окне смайлов при написании поста. Нажмите на смайл, чтобы убрать. Максимум 48.</p>
        <div className="flex flex-wrap gap-1.5">
          {emoji.map((e) => (
            <button key={e} onClick={() => setEmoji(emoji.filter((x) => x !== e))} title="Убрать" className="text-2xl w-10 h-10 rounded-lg bg-rail hover:bg-destructive/30 flex items-center justify-center">{e}</button>
          ))}
        </div>
        <div className="flex gap-2 max-w-sm">
          <input className="flex-1 bg-rail rounded px-3 h-9 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground" placeholder="Вставьте смайл или несколько через пробел" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEmoji()} />
          <Button variant="secondary" className="h-9" disabled={!newEmoji.trim() || emoji.length >= 48} onClick={addEmoji}>Добавить</Button>
        </div>
      </div>

      <Button disabled={busy || !dirty} className="font-semibold" onClick={save}>
        {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
        Сохранить
      </Button>
    </div>
  );
};

export default GraphicsManager;
