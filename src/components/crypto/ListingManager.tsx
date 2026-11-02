import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { fmtPrice } from "@/lib/crypto";
import { fmtDateTime, fundFmt, fundRequest } from "@/lib/fund";
import { ListingItem } from "@/lib/listings";
import ShopImagePicker, { PickedImage } from "./ShopImagePicker";
import OrderBook from "./trading/OrderBook";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

type Item = ListingItem & { openPositions: number; holders: number; trades: number; turnover: number; manualWalls: { id: number; side: string; price: number; qty: number }[] };
interface Data {
  items: Item[];
  anchors: { id: string; name: string }[];
  statuses: Record<string, string>;
}

const STATUS_CLS: Record<string, string> = {
  draft: "text-muted-foreground border-border",
  scheduled: "text-sky-300 border-sky-300/40",
  trading: "text-[#22C55E] border-[#22C55E]/40",
  halted: "text-[#FBBF24] border-[#FBBF24]/40",
  delisted: "text-[#EA3943] border-[#EA3943]/40",
};

const localInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toServer = (v: string) => (v ? new Date(v).toISOString().slice(0, 19) : "");

const EMPTY = {
  name: "", symbol: "", description: "", color: "#F97316", startPrice: "1", totalSupply: "1000000000", status: "draft", listingAt: "",
  volatility: "1.5", drift: "0", liquidity: "100000", spreadPct: "0.2", tickSize: "0", maxLeverage: "5", minLevel: "1", allowShort: true,
  minMargin: "1", maxMargin: "0", feePercent: "-1", anchorCoin: "", anchorBeta: "1", sort: "0",
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="space-y-1 block">
    <span className="text-xs text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="text-[10px] text-muted-foreground/80 block leading-snug">{hint}</span>}
  </label>
);

const ListingManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["listing-admin", token],
    enabled: !!token,
    refetchInterval: 30_000,
    queryFn: () => fundRequest<Data>(token, "?action=listing_admin"),
  });
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [icon, setIcon] = useState<PickedImage | null>(null);
  const [iconRemoved, setIconRemoved] = useState(false);
  const [curIcon, setCurIcon] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [wall, setWall] = useState({ side: "bid", price: "", qty: "" });
  const [moveBy, setMoveBy] = useState("10");

  const run = async (body: object, ok: string, after?: () => void) => {
    setBusy(true);
    try {
      const next = await fundRequest<Data>(token, "", body);
      qc.setQueryData(["listing-admin", token], next);
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["listing-book"] });
      after?.();
      toast({ title: ok });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm({ ...form, [k]: v });
  const reset = () => {
    setForm(EMPTY);
    setEditing(null);
    setIcon(null);
    setIconRemoved(false);
    setCurIcon("");
  };

  const payload = () => ({
    ...form, startPrice: Number(form.startPrice), totalSupply: Number(form.totalSupply), volatility: Number(form.volatility), drift: Number(form.drift),
    liquidity: Number(form.liquidity), spreadPct: Number(form.spreadPct), tickSize: Number(form.tickSize), maxLeverage: Number(form.maxLeverage),
    minLevel: Number(form.minLevel), minMargin: Number(form.minMargin), maxMargin: Number(form.maxMargin), feePercent: Number(form.feePercent),
    anchorBeta: Number(form.anchorBeta), sort: Number(form.sort), listingAt: toServer(form.listingAt),
    iconData: icon?.data, iconType: icon?.type, removeIcon: iconRemoved,
  });

  const startEdit = (l: Item) => {
    setEditing(l.id);
    setIcon(null);
    setIconRemoved(false);
    setCurIcon(l.iconUrl);
    setForm({
      name: l.name, symbol: l.symbol, description: l.description, color: l.color, startPrice: String(l.startPrice), totalSupply: String(l.totalSupply),
      status: l.status, listingAt: localInput(l.listingAt), volatility: String(l.volatility), drift: String(l.drift), liquidity: String(l.liquidity),
      spreadPct: String(l.spreadPct), tickSize: String(l.tickSize), maxLeverage: String(l.maxLeverage), minLevel: String(l.minLevel), allowShort: l.allowShort,
      minMargin: String(l.minMargin), maxMargin: String(l.maxMargin), feePercent: String(l.feePercent), anchorCoin: l.anchorCoin, anchorBeta: String(l.anchorBeta), sort: String(l.sort),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = () => run({ action: "listing_save", id: editing ?? 0, ...payload() }, editing ? "Монета обновлена" : "Монета создана", reset);
  const locked = editing !== null && data.items.find((x) => x.id === editing)?.status !== "draft" && data.items.find((x) => x.id === editing)?.status !== "scheduled";

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white flex items-center gap-2"><Icon name="Rocket" size={22} className="text-primary" /> Листинг новых монет</h1>
        <p className="text-muted-foreground text-sm max-w-3xl">
          Создавайте собственные монеты: задайте цену, объём, стакан заявок, иконку и время запуска. Запущенная монета появится в «Котировках» и на тренировочной бирже. Цена двигается сама по заданной волатильности и может следовать за выбранной монетой.
        </p>
      </div>

      <section className="bg-card border border-border rounded-lg p-4 space-y-4">
        <h2 className="text-white font-semibold text-sm">{editing ? "Редактирование монеты" : "Новая монета"}</h2>

        <div className="flex gap-3 items-start flex-wrap">
          <ShopImagePicker current={curIcon} picked={icon} removed={iconRemoved} onPick={setIcon} onRemove={() => setIconRemoved(true)} size={64} maxSide={256} />
          <div className="flex-1 grid sm:grid-cols-3 gap-3 min-w-[260px]">
            <Field label="Название"><input className={inputCls} maxLength={60} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Moon Coin" /></Field>
            <Field label="Тикер" hint={editing ? "Тикер менять нельзя" : "Латиница и цифры, например MOON"}>
              <input className={`${inputCls} font-mono`} maxLength={12} disabled={!!editing} value={form.symbol} onChange={(e) => set("symbol", e.target.value.toUpperCase())} />
            </Field>
            <Field label="Цвет значка (если нет иконки)"><input type="color" className="w-full h-10 bg-rail rounded cursor-pointer" value={form.color} onChange={(e) => set("color", e.target.value)} /></Field>
          </div>
        </div>
        <textarea className={`${inputCls} h-16 py-2 resize-none`} maxLength={600} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Описание монеты для участников (необязательно)" />

        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Цена и объём</h3>
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label="Стартовая цена, USDT" hint={locked ? "Меняется только до запуска" : "Цена в момент листинга"}>
              <input className={inputCls} type="number" min={0} step="any" disabled={locked} value={form.startPrice} onChange={(e) => set("startPrice", e.target.value)} />
            </Field>
            <Field label="Всего монет в обороте" hint="От этого зависит капитализация"><input className={inputCls} type="number" min={0} value={form.totalSupply} onChange={(e) => set("totalSupply", e.target.value)} /></Field>
            <Field label="Дневной оборот, USDT" hint="Чем больше, тем глубже стакан и меньше проскальзывание">
              <input className={inputCls} type="number" min={100} value={form.liquidity} onChange={(e) => set("liquidity", e.target.value)} />
            </Field>
            <Field label="Шаг цены" hint="0 — автоматически"><input className={inputCls} type="number" min={0} step="any" value={form.tickSize} onChange={(e) => set("tickSize", e.target.value)} /></Field>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Поведение цены</h3>
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label="Волатильность, % в час" hint="Типичный размах движения. 0.5 спокойно, 5 — бурно"><input className={inputCls} type="number" min={0} max={50} step="any" value={form.volatility} onChange={(e) => set("volatility", e.target.value)} /></Field>
            <Field label="Тренд, % в час" hint="Плюс — рост, минус — падение"><input className={inputCls} type="number" min={-20} max={20} step="any" value={form.drift} onChange={(e) => set("drift", e.target.value)} /></Field>
            <Field label="Следовать за монетой" hint="Двигается вместе с выбранной">
              <select className={inputCls} value={form.anchorCoin} onChange={(e) => set("anchorCoin", e.target.value)}>
                <option value="">Не следовать</option>
                {data.anchors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Сила связи" hint="1 — как у эталона, 2 — вдвое сильнее"><input className={inputCls} type="number" min={0} max={5} step="any" value={form.anchorBeta} onChange={(e) => set("anchorBeta", e.target.value)} /></Field>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Стакан заявок</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Разница покупки и продажи, %" hint="Чем больше, тем дороже входить"><input className={inputCls} type="number" min={0.01} max={10} step="any" value={form.spreadPct} onChange={(e) => set("spreadPct", e.target.value)} /></Field>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Условия торговли</h3>
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label="Максимальное плечо"><input className={inputCls} type="number" min={1} max={100} value={form.maxLeverage} onChange={(e) => set("maxLeverage", e.target.value)} /></Field>
            <Field label="Нужный статус участника" hint="1 — любой"><input className={inputCls} type="number" min={1} max={20} value={form.minLevel} onChange={(e) => set("minLevel", e.target.value)} /></Field>
            <Field label="Ставка от, USDT"><input className={inputCls} type="number" min={0} step="any" value={form.minMargin} onChange={(e) => set("minMargin", e.target.value)} /></Field>
            <Field label="Ставка до, USDT" hint="0 — без ограничения"><input className={inputCls} type="number" min={0} step="any" value={form.maxMargin} onChange={(e) => set("maxMargin", e.target.value)} /></Field>
            <Field label="Комиссия, %" hint="-1 — как на всей бирже"><input className={inputCls} type="number" min={-1} max={5} step="any" value={form.feePercent} onChange={(e) => set("feePercent", e.target.value)} /></Field>
            <label className="flex items-center gap-2 pt-6 text-sm text-white cursor-pointer">
              <Switch checked={form.allowShort} onCheckedChange={(v) => set("allowShort", v)} /> Разрешить шорт
            </label>
            <Field label="Порядок в списке" hint="Меньше — выше"><input className={inputCls} type="number" value={form.sort} onChange={(e) => set("sort", e.target.value)} /></Field>
          </div>
        </div>

        {!editing && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Запуск</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Когда запускать">
                <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="draft">Пока не запускать (черновик)</option>
                  <option value="scheduled">В назначенное время</option>
                  <option value="trading">Сразу в торги</option>
                </select>
              </Field>
              {form.status === "scheduled" && (
                <Field label="Дата и время запуска"><input className={inputCls} type="datetime-local" value={form.listingAt} onChange={(e) => set("listingAt", e.target.value)} /></Field>
              )}
            </div>
          </div>
        )}
        {editing && (form.status === "scheduled" || form.status === "draft") && (
          <Field label="Дата и время запуска"><input className={`${inputCls} sm:max-w-xs`} type="datetime-local" value={form.listingAt} onChange={(e) => set("listingAt", e.target.value)} /></Field>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={save} disabled={busy || form.name.trim().length < 2 || form.symbol.trim().length < 2} className="font-semibold">
            {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
            {editing ? "Сохранить изменения" : "Создать монету"}
          </Button>
          {editing && <Button variant="ghost" onClick={reset}>Отмена</Button>}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-white font-semibold text-sm">Монеты</h2>
        {data.items.length === 0 && <p className="text-sm text-muted-foreground">Пока нет ни одной монеты. Создайте первую выше.</p>}
        {data.items.map((l) => {
          const live = l.status === "trading" || l.status === "halted";
          return (
            <div key={l.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {l.iconUrl ? (
                  <img src={l.iconUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono font-bold text-black flex-shrink-0" style={{ background: l.color }}>{l.symbol.slice(0, 3)}</div>
                )}
                <div className="min-w-0">
                  <div className="text-white font-semibold text-sm flex items-center gap-2 flex-wrap">
                    {l.name} <span className="text-muted-foreground font-mono text-xs">{l.symbol}</span>
                    <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${STATUS_CLS[l.status]}`}>{l.statusRu}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {l.status === "scheduled" && l.listingAt ? `Запуск: ${fmtDateTime(l.listingAt)}` : `Плечо до x${l.maxLeverage} · статус от ${l.minLevel} · волатильность ${l.volatility}%/ч`}
                  </div>
                </div>
                {live && (
                  <div className="ml-auto text-right">
                    <div className="font-mono text-white">{fmtPrice(l.price, l.slug)}</div>
                    <div className={`font-mono text-xs ${l.change24h >= 0 ? "text-[#16C784]" : "text-[#EA3943]"}`}>{l.change24h >= 0 ? "+" : ""}{l.change24h.toFixed(2).replace(".", ",")}%</div>
                  </div>
                )}
              </div>
              {live && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  {[
                    ["Оборот 24ч", `${fundFmt(l.volume24h)} USDT`],
                    ["Капитализация", `${fundFmt(l.marketCap)} USDT`],
                    ["Держателей", `${l.holders}`],
                    ["Открытых позиций", `${l.openPositions}`],
                    ["Сделок", `${l.trades}`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-rail/60 rounded px-2 py-1.5">
                      <div className="text-muted-foreground">{k}</div>
                      <div className="text-white font-mono truncate">{v}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="bg-transparent h-8" onClick={() => startEdit(l)}>
                  <Icon name="Pencil" size={13} className="mr-1" /> Изменить
                </Button>
                {(l.status === "draft" || l.status === "scheduled") && (
                  <Button size="sm" className="h-8" disabled={busy} onClick={() => run({ action: "listing_status", id: l.id, status: "trading" }, "Монета запущена")}>
                    <Icon name="Rocket" size={13} className="mr-1" /> Запустить сейчас
                  </Button>
                )}
                {l.status === "draft" && l.listingAt && (
                  <Button size="sm" variant="secondary" className="h-8" disabled={busy} onClick={() => run({ action: "listing_status", id: l.id, status: "scheduled" }, "Запуск назначен")}>Назначить запуск</Button>
                )}
                {l.status === "scheduled" && (
                  <Button size="sm" variant="ghost" className="h-8" disabled={busy} onClick={() => run({ action: "listing_status", id: l.id, status: "draft" }, "Запуск отменён")}>В черновик</Button>
                )}
                {l.status === "trading" && (
                  <Button size="sm" variant="secondary" className="h-8" disabled={busy} onClick={() => run({ action: "listing_status", id: l.id, status: "halted" }, "Торги остановлены")}>
                    <Icon name="Pause" size={13} className="mr-1" /> Остановить торги
                  </Button>
                )}
                {l.status === "halted" && (
                  <Button size="sm" className="h-8" disabled={busy} onClick={() => run({ action: "listing_status", id: l.id, status: "trading" }, "Торги возобновлены")}>
                    <Icon name="Play" size={13} className="mr-1" /> Возобновить
                  </Button>
                )}
                {live && (
                  <Button size="sm" variant="outline" className="bg-transparent h-8" onClick={() => setOpen(open === l.id ? null : l.id)}>
                    <Icon name="BookOpen" size={13} className="mr-1" /> Стакан и цена
                  </Button>
                )}
                {live && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-muted-foreground hover:text-[#EA3943]"
                    disabled={busy}
                    onClick={() => window.confirm(`Снять ${l.name} с торгов? Все открытые позиции закроются по последней цене, ордера отменятся, участникам вернётся маржа.`) && run({ action: "listing_status", id: l.id, status: "delisted" }, "Монета снята с торгов")}
                  >
                    Снять с торгов
                  </Button>
                )}
                {(l.status === "draft" || l.status === "scheduled" || l.status === "delisted") && (
                  <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-[#EA3943]" disabled={busy} onClick={() => window.confirm("Удалить монету навсегда?") && run({ action: "listing_delete", id: l.id }, "Монета удалена")}>
                    <Icon name="Trash2" size={13} className="mr-1" /> Удалить
                  </Button>
                )}
              </div>

              {open === l.id && live && (
                <div className="grid lg:grid-cols-2 gap-4 border-t border-border pt-3">
                  <div>
                    <OrderBook slug={l.slug} />
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-lg bg-rail/50 p-3 space-y-2">
                      <h4 className="text-white text-sm font-semibold">Двинуть цену</h4>
                      <p className="text-[11px] text-muted-foreground">Резкое движение на заданный процент, например +10 или −15. Позиции участников пересчитаются сами.</p>
                      <div className="flex gap-2">
                        <input className={`${inputCls} w-28`} type="number" value={moveBy} onChange={(e) => setMoveBy(e.target.value)} />
                        <Button size="sm" className="h-10" disabled={busy || l.status !== "trading"} onClick={() => run({ action: "listing_move", id: l.id, percent: Number(moveBy) }, "Цена сдвинута")}>Применить, %</Button>
                      </div>
                    </div>
                    <div className="rounded-lg bg-rail/50 p-3 space-y-2">
                      <h4 className="text-white text-sm font-semibold">Своя заявка в стакане</h4>
                      <p className="text-[11px] text-muted-foreground">Крупная «стена» на покупку или продажу. Участники будут упираться в неё и покупать дороже.</p>
                      <div className="grid grid-cols-3 gap-2">
                        <select className={inputCls} value={wall.side} onChange={(e) => setWall({ ...wall, side: e.target.value })}>
                          <option value="bid">Покупка</option>
                          <option value="ask">Продажа</option>
                        </select>
                        <input className={inputCls} type="number" step="any" placeholder="Цена" value={wall.price} onChange={(e) => setWall({ ...wall, price: e.target.value })} />
                        <input className={inputCls} type="number" step="any" placeholder="Кол-во монет" value={wall.qty} onChange={(e) => setWall({ ...wall, qty: e.target.value })} />
                      </div>
                      <Button size="sm" variant="secondary" disabled={busy || !wall.price || !wall.qty} onClick={() => run({ action: "listing_wall", id: l.id, side: wall.side, price: Number(wall.price), qty: Number(wall.qty) }, "Заявка добавлена", () => setWall({ ...wall, price: "", qty: "" }))}>
                        Добавить заявку
                      </Button>
                      {l.manualWalls.length > 0 && (
                        <div className="divide-y divide-border">
                          {l.manualWalls.map((w) => (
                            <div key={w.id} className="flex items-center gap-2 py-1 text-xs font-mono">
                              <span className={w.side === "bid" ? "text-[#16C784]" : "text-[#EA3943]"}>{w.side === "bid" ? "покупка" : "продажа"}</span>
                              <span className="text-white">{fmtPrice(w.price, l.slug)}</span>
                              <span className="text-muted-foreground flex-1">{w.qty}</span>
                              <button className="text-muted-foreground hover:text-[#EA3943]" onClick={() => run({ action: "listing_wall_clear", id: l.id, wallId: w.id }, "Заявка убрана")}>
                                <Icon name="X" size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default ListingManager;
