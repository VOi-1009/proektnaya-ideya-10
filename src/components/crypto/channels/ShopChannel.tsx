import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { fundRequest } from "@/lib/fund";
import { CARD_BG, FRAME_STYLE, HEADER_BG, KIND_ICON, ShopCatalog, ShopItem, ShopKind, THEME_STYLE, shopFmt, useShopCatalog } from "@/lib/shop";
import TkaIcon from "../TkaIcon";

const ORDER: ShopKind[] = ["header", "frame", "card", "theme", "badge", "gift"];

const Preview = ({ item }: { item: ShopItem }) => {
  if (item.kind === "header")
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="h-3" style={{ background: HEADER_BG[item.slug] }} />
        <div className="px-2 py-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/80" />
          <span className="h-2 w-16 rounded bg-hover" />
        </div>
      </div>
    );
  if (item.kind === "frame") {
    const f = FRAME_STYLE[item.slug];
    return (
      <div className="h-14 flex items-center justify-center">
        <span
          className="inline-flex rounded-full"
          style={f?.background ? { background: f.background, padding: 3 } : { outline: `3px solid ${f?.ring}`, outlineOffset: 2, boxShadow: f?.boxShadow }}
        >
          <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-display">Т</span>
        </span>
      </div>
    );
  }
  if (item.kind === "card")
    return (
      <div className="rounded-lg overflow-hidden border border-border">
        <div className="h-9" style={{ background: CARD_BG[item.slug] }} />
        <div className="h-6 bg-card" />
      </div>
    );
  if (item.kind === "theme") {
    const t = THEME_STYLE[item.slug];
    return (
      <div className="rounded-lg border p-2 space-y-1.5" style={{ background: t?.background, borderColor: t?.borderColor }}>
        <span className="block h-2 w-3/4 rounded bg-white/20" />
        <span className="block h-2 w-1/2 rounded bg-white/10" />
      </div>
    );
  }
  return <div className="h-14 flex items-center justify-center text-4xl leading-none">{item.emoji}</div>;
};

const ShopChannel = () => {
  const { user, token, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useShopCatalog(token);
  const [kind, setKind] = useState<ShopKind | "all">("all");
  const [busy, setBusy] = useState<number | null>(null);
  const [gift, setGift] = useState<ShopItem | null>(null);
  const [toUser, setToUser] = useState("");
  const [msg, setMsg] = useState("");

  const act = async (body: Record<string, unknown>, ok: string, id: number) => {
    setBusy(id);
    try {
      const next = await fundRequest<ShopCatalog>(token, "", body);
      qc.setQueryData(["shop-catalog", token], next);
      qc.invalidateQueries({ queryKey: ["cosmetics-all"] });
      qc.invalidateQueries({ queryKey: ["tka-wallet"] });
      toast({ title: ok });
      return true;
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !data) return <Skeleton className="h-72 w-full max-w-5xl mx-auto bg-card" />;
  const st = data.settings;
  const kinds = ORDER.filter((k) => data.items.some((i) => i.kind === k));
  const items = data.items.filter((i) => kind === "all" || i.kind === kind);

  const buy = (it: ShopItem) => {
    if (!user) return setAuthOpen(true);
    act({ action: "shop_buy", itemId: it.id }, `Куплено: ${it.name}`, it.id);
  };
  const sendGift = async () => {
    if (!gift) return;
    const ok = await act({ action: "shop_gift", itemId: gift.id, toUser: Number(toUser), message: msg }, `Подарок отправлен: ${gift.name}`, gift.id);
    if (ok) {
      setGift(null);
      setToUser("");
      setMsg("");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 flex-wrap">
        <Icon name="Store" size={22} className="text-primary" />
        <div className="min-w-0">
          <h2 className="font-display text-lg text-white leading-tight">Магазин</h2>
          <p className="text-xs text-muted-foreground">Украшения профиля и подарки за TKA. Это игровые предметы, реальной стоимости у них нет.</p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-lg bg-rail px-3 py-2">
          <TkaIcon size={20} />
          <span className="font-mono text-white">{user ? shopFmt(data.balance) : "—"}</span>
          <span className="text-[10px] font-semibold text-primary">TKA</span>
        </div>
      </section>

      {!st.enabled && (
        <div className="rounded-lg border border-[#EA3943]/40 bg-[#EA3943]/10 px-3 py-2 text-sm text-foreground">
          {st.message || "Магазин временно закрыт. Купленные вещи по-прежнему можно надевать."}
        </div>
      )}
      {st.enabled && st.discountPercent > 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground flex items-center gap-2">
          <Icon name="Percent" size={15} className="text-primary" /> Скидка {String(st.discountPercent).replace(".", ",")}% на все товары
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...kinds] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5 ${
              kind === k ? "bg-white text-black border-white" : "border-input text-muted-foreground hover:text-white hover:border-white/40"
            }`}
          >
            {k !== "all" && <Icon name={KIND_ICON[k]} size={12} />}
            {k === "all" ? "Всё" : data.kinds[k]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it) => {
          const isGift = it.kind === "gift";
          const sale = it.price < it.basePrice;
          return (
            <article key={it.id} className={`rounded-xl border bg-card p-3 flex flex-col gap-2 ${it.equipped ? "border-primary" : "border-border"}`}>
              <Preview item={it} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-white text-sm font-semibold truncate">{it.name}</h3>
                  {it.equipped && <span className="text-[9px] uppercase tracking-wider text-primary border border-primary/50 rounded px-1">надето</span>}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 min-h-[28px]">{it.description}</p>
              </div>
              <div className="mt-auto space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm">
                  <TkaIcon size={14} />
                  <span className="font-mono text-white">{shopFmt(it.price)}</span>
                  {sale && <span className="font-mono text-[10px] text-muted-foreground line-through">{shopFmt(it.basePrice)}</span>}
                  {it.stock !== null && <span className="ml-auto text-[10px] text-muted-foreground">{Math.max(it.stock - it.sold, 0)} шт.</span>}
                </div>
                <div className="flex gap-1.5">
                  {isGift ? (
                    <Button size="sm" className="flex-1 h-8 text-xs" disabled={!st.enabled || it.soldOut} onClick={() => (user ? setGift(it) : setAuthOpen(true))}>
                      <Icon name="Gift" size={13} className="mr-1" /> Подарить
                    </Button>
                  ) : it.owned ? (
                    <Button
                      size="sm"
                      variant={it.equipped ? "secondary" : "default"}
                      className="flex-1 h-8 text-xs"
                      disabled={busy === it.id}
                      onClick={() => act({ action: "shop_equip", itemId: it.id, off: it.equipped }, it.equipped ? "Снято" : `Надето: ${it.name}`, it.id)}
                    >
                      {it.equipped ? "Снять" : "Надеть"}
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" className="flex-1 h-8 text-xs" disabled={busy === it.id || !st.enabled || it.soldOut} onClick={() => buy(it)}>
                        {it.soldOut ? "Раскуплено" : "Купить"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2 bg-transparent" title="Подарить" disabled={!st.enabled || it.soldOut} onClick={() => (user ? setGift(it) : setAuthOpen(true))}>
                        <Icon name="Gift" size={13} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {gift && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setGift(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Icon name="Gift" size={18} className="text-primary" />
              <h3 className="text-white font-semibold">Подарить: {gift.name}</h3>
              <button className="ml-auto text-muted-foreground hover:text-white" onClick={() => setGift(null)} aria-label="Закрыть">
                <Icon name="X" size={16} />
              </button>
            </div>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Номер участника (он виден на его странице в рейтинге и в адресе профиля)</span>
              <Input type="number" min={1} value={toUser} onChange={(e) => setToUser(e.target.value)} placeholder="Например, 2" />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Короткое сообщение (необязательно)</span>
              <Input maxLength={140} value={msg} onChange={(e) => setMsg(e.target.value)} />
            </label>
            <p className="text-[11px] text-muted-foreground">
              Спишется {shopFmt(gift.price * (1 + st.giftFeePercent / 100))} TKA{st.giftFeePercent > 0 ? ` (включая комиссию ${String(st.giftFeePercent).replace(".", ",")}%)` : ""}. Можно дарить не больше {st.giftDailyLimit} раз в сутки.
            </p>
            <Button className="w-full font-semibold" disabled={busy === gift.id || !Number(toUser)} onClick={sendGift}>
              Отправить подарок
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopChannel;
