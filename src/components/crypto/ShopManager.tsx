import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { fundFmt, fundRequest } from "@/lib/fund";
import { ShopCatalog, ShopItem, ShopSettings } from "@/lib/shop";
import ShopImagePicker, { PickedImage } from "./ShopImagePicker";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

interface AdminData extends ShopCatalog {
  stats: { buys: number; revenue: number; gifts: number; giftsSum: number; granted: number };
  top: { name: string; count: number }[];
  recent: { id: number; price: number; source: string; at: string; item: string; user: string }[];
}

const SRC: Record<string, string> = { buy: "покупка", gift: "подарок" };

const Row = ({ it, onSave, busy }: { it: ShopItem; onSave: (v: ShopItem, img: PickedImage | null, removeImage: boolean) => void; busy: boolean }) => {
  const [v, setV] = useState(it);
  const [img, setImg] = useState<PickedImage | null>(null);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    setV(it);
    setImg(null);
    setRemoved(false);
  }, [it]);
  const withImage = it.kind === "badge" || it.kind === "gift";
  const dirty = !!img || removed || JSON.stringify([v.name, v.description, v.basePrice, v.stock, v.sort, v.enabled]) !== JSON.stringify([it.name, it.description, it.basePrice, it.stock, it.sort, it.enabled]);
  return (
    <div className={`grid ${withImage ? "grid-cols-[auto_1fr_88px_88px_64px_auto_auto]" : "grid-cols-[1fr_88px_88px_64px_auto_auto]"} gap-2 items-center py-2`}>
      {withImage && <ShopImagePicker current={it.imageUrl} emoji={it.emoji} picked={img} removed={removed} onPick={(p) => { setImg(p); setRemoved(false); }} onRemove={() => setRemoved(true)} />}
      <div className="min-w-0 space-y-1">
        <input className={`${inputCls} h-8`} value={v.name} maxLength={60} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <input className={`${inputCls} h-8 text-xs`} value={v.description} maxLength={200} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </div>
      <input className={`${inputCls} h-8`} type="number" min={0} step="0.01" value={v.basePrice} title="Цена, TKA" onChange={(e) => setV({ ...v, basePrice: Number(e.target.value) })} />
      <input className={`${inputCls} h-8`} type="number" min={0} placeholder="∞" value={v.stock ?? ""} title="Сколько всего штук (пусто — без ограничения)" onChange={(e) => setV({ ...v, stock: e.target.value === "" ? null : Number(e.target.value) })} />
      <input className={`${inputCls} h-8 px-2`} type="number" min={0} value={v.sort} title="Порядок" onChange={(e) => setV({ ...v, sort: Number(e.target.value) })} />
      <Switch checked={v.enabled} onCheckedChange={(c) => setV({ ...v, enabled: c })} />
      <Button size="sm" variant={dirty ? "default" : "ghost"} className="h-8" disabled={busy || !dirty} onClick={() => onSave(v, img, removed)}>
        {it.sold > 0 && !dirty ? `продано ${it.sold}` : "Сохранить"}
      </Button>
    </div>
  );
};

const ShopManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["shop-admin", token],
    queryFn: () => fundRequest<AdminData>(token, "?action=shop_admin"),
    enabled: !!token,
  });
  const [f, setF] = useState<ShopSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState({ kind: "badge", name: "", emoji: "", price: "", description: "" });
  const [addImg, setAddImg] = useState<PickedImage | null>(null);
  const [grant, setGrant] = useState({ userId: "", itemId: "" });

  useEffect(() => {
    if (data && !f) setF(data.settings);
  }, [data, f]);

  const run = async (body: object, ok: string, after?: () => void) => {
    setBusy(true);
    try {
      const next = await fundRequest<AdminData>(token, "", body);
      qc.setQueryData(["shop-admin", token], next);
      qc.invalidateQueries({ queryKey: ["shop-catalog"] });
      qc.invalidateQueries({ queryKey: ["cosmetics-all"] });
      after?.();
      toast({ title: ok });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!data || !f) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const grantable = data.items.filter((i) => i.kind !== "gift");

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Магазин</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">Товары, цены и правила подарков. Платят участники в TKA со своего кошелька, потраченные TKA уходят из оборота.</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-2">
        {[
          ["Покупок", String(data.stats.buys)],
          ["Потрачено участниками", `${fundFmt(data.stats.revenue)} TKA`],
          ["Подарков отправлено", `${data.stats.gifts} · ${fundFmt(data.stats.giftsSum)} TKA`],
          ["Выдано вами бесплатно", String(data.stats.granted)],
        ].map(([l, v]) => (
          <div key={l} className="bg-card border border-border rounded-lg px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{l}</div>
            <div className="font-mono text-white text-sm">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Settings" size={15} className="text-primary" /> Настройки магазина</h2>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
            Магазин открыт (покупки и подарки)
          </label>
          {!f.enabled && (
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Сообщение участникам</span>
              <input className={inputCls} maxLength={200} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Например: обновляем ассортимент" />
            </label>
          )}
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Скидка на всё, %</span>
              <input className={inputCls} type="number" min={0} max={90} value={f.discountPercent} onChange={(e) => setF({ ...f, discountPercent: Number(e.target.value) })} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Подарков в сутки</span>
              <input className={inputCls} type="number" min={0} max={100} value={f.giftDailyLimit} onChange={(e) => setF({ ...f, giftDailyLimit: Number(e.target.value) })} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Наценка на подарок, %</span>
              <input className={inputCls} type="number" min={0} max={50} step="0.5" value={f.giftFeePercent} onChange={(e) => setF({ ...f, giftFeePercent: Number(e.target.value) })} />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">0 подарков в сутки отключает подарки. Скидка действует на все товары сразу.</p>
          <Button disabled={busy} className="font-semibold" onClick={() => run({ action: "shop_save", ...f }, "Настройки магазина сохранены")}>
            {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
            Сохранить
          </Button>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="PlusCircle" size={15} className="text-primary" /> Новый значок или подарок</h2>
            <div className="flex items-center gap-3">
              <ShopImagePicker picked={addImg} onPick={setAddImg} size={56} />
              <p className="text-[11px] text-muted-foreground">Нажмите на квадрат, чтобы выбрать картинку (PNG, JPG, WEBP, GIF). Она уменьшится сама. Если картинки нет, можно указать эмодзи.</p>
            </div>
            <div className="grid grid-cols-[110px_60px_1fr_90px] gap-2">
              <select className={inputCls} value={add.kind} onChange={(e) => setAdd({ ...add, kind: e.target.value })}>
                <option value="badge">Значок</option>
                <option value="gift">Подарок</option>
              </select>
              <input className={`${inputCls} text-center px-1`} maxLength={8} placeholder="или 😀" value={add.emoji} onChange={(e) => setAdd({ ...add, emoji: e.target.value })} />
              <input className={inputCls} maxLength={60} placeholder="Название" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
              <input className={inputCls} type="number" min={0} placeholder="Цена" value={add.price} onChange={(e) => setAdd({ ...add, price: e.target.value })} />
            </div>
            <input className={inputCls} maxLength={200} placeholder="Описание (необязательно)" value={add.description} onChange={(e) => setAdd({ ...add, description: e.target.value })} />
            <Button variant="secondary" disabled={busy || add.name.trim().length < 2 || !(add.emoji.trim() || addImg) || add.price === ""} onClick={() => run({ action: "shop_item_add", ...add, price: Number(add.price), imageData: addImg?.data, imageType: addImg?.type }, "Товар добавлен", () => { setAdd({ kind: "badge", name: "", emoji: "", price: "", description: "" }); setAddImg(null); })}>
              Добавить
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Gift" size={15} className="text-primary" /> Выдать участнику бесплатно</h2>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <input className={inputCls} type="number" min={1} placeholder="№ юзера" value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })} />
              <select className={inputCls} value={grant.itemId} onChange={(e) => setGrant({ ...grant, itemId: e.target.value })}>
                <option value="">Выберите товар</option>
                {grantable.map((i) => (
                  <option key={i.id} value={i.id}>{data.kinds[i.kind]} · {i.name}</option>
                ))}
              </select>
            </div>
            <Button variant="secondary" disabled={busy || !Number(grant.userId) || !grant.itemId} onClick={() => run({ action: "shop_grant", userId: Number(grant.userId), itemId: Number(grant.itemId) }, "Выдано", () => setGrant({ userId: "", itemId: "" }))}>
              Выдать
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-white font-semibold text-sm mb-1">Товары</h2>
        <p className="text-[11px] text-muted-foreground mb-2">Колонки: название и описание, цена в TKA, всего штук (пусто — без ограничения), порядок, включён.</p>
        {Object.entries(data.kinds).map(([k, label]) => {
          const list = data.items.filter((i) => i.kind === k);
          if (!list.length) return null;
          return (
            <div key={k} className="mb-3">
              <div className="text-xs font-semibold text-primary mb-0.5">{label}</div>
              <div className="divide-y divide-border">
                {list.map((it) => (
                  <Row
                    key={it.id}
                    it={it}
                    busy={busy}
                    onSave={(v, img, removeImage) => run({ action: "shop_item_save", id: v.id, name: v.name, description: v.description, price: v.basePrice, stock: v.stock, sort: v.sort, enabled: v.enabled, imageData: img?.data, imageType: img?.type, removeImage }, `Сохранено: ${v.name}`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-white font-semibold text-sm mb-2">Самые популярные</h2>
          {data.top.length === 0 ? <p className="text-sm text-muted-foreground">Покупок пока нет.</p> : (
            <div className="divide-y divide-border">
              {data.top.map((t) => (
                <div key={t.name} className="flex justify-between py-1.5 text-sm"><span className="text-white">{t.name}</span><span className="font-mono text-muted-foreground">{t.count}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-white font-semibold text-sm mb-2">Последние операции</h2>
          {data.recent.length === 0 ? <p className="text-sm text-muted-foreground">Операций пока нет.</p> : (
            <div className="divide-y divide-border">
              {data.recent.map((r) => (
                <div key={r.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="text-white truncate">{r.item}</div>
                    <div className="text-[11px] text-muted-foreground">{r.user} · {SRC[r.source] ?? r.source} · {new Date(r.at + "Z").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</div>
                  </div>
                  <span className="font-mono text-muted-foreground">{r.price > 0 ? fundFmt(r.price) : "0"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopManager;
