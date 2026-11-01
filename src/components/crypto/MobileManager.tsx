import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { fundRequest, MOBILE_SECTIONS, MobileBlock, MobileSettings, MobileTab } from "@/lib/fund";
import MobileBlockView from "@/components/mobile/MobileBlockView";

const inputCls =
  "w-full bg-rail rounded px-3 h-9 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const KINDS: Record<string, string> = { empty: "Пустой (заполним позже)", text: "Текст", banner: "Баннер", link: "Ссылка", market_summary: "Рыночная сводка" };
type Data = { settings: MobileSettings; sections: string[] };

const MobileManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["mobile-admin", token],
    queryFn: () => fundRequest<Data>(token, "?action=mobile_settings"),
    enabled: !!token,
  });
  const [f, setF] = useState<MobileSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string>("home");

  useEffect(() => {
    if (data && !f) setF(data.settings);
  }, [data, f]);

  if (!data || !f) return <p className="text-muted-foreground text-sm">Загружаю…</p>;

  const set = <K extends keyof MobileSettings>(k: K, v: MobileSettings[K]) => setF({ ...f, [k]: v });
  const setTab = (id: string, patch: Partial<MobileTab>) => set("tabs", f.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const moveTab = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= f.tabs.length) return;
    const next = [...f.tabs];
    [next[i], next[j]] = [next[j], next[i]];
    set("tabs", next);
  };
  const addTab = (id: string) => {
    if (f.tabs.length >= 6 || f.tabs.some((t) => t.id === id)) return;
    set("tabs", [...f.tabs, { id, label: MOBILE_SECTIONS[id].label, icon: MOBILE_SECTIONS[id].icon, enabled: true }]);
  };
  const setBlock = (id: string, patch: Partial<MobileBlock>) => set("blocks", f.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const addBlock = (tab: string) =>
    set("blocks", [...f.blocks, { id: `b${Date.now().toString(36)}`, tab, kind: "empty", title: "", text: "", url: "", enabled: true }]);
  const moveBlock = (id: string, d: number) => {
    const same = f.blocks.filter((b) => b.tab === open);
    const i = same.findIndex((b) => b.id === id);
    const j = i + d;
    if (j < 0 || j >= same.length) return;
    const a = f.blocks.findIndex((b) => b.id === same[i].id);
    const b2 = f.blocks.findIndex((b) => b.id === same[j].id);
    const next = [...f.blocks];
    [next[a], next[b2]] = [next[b2], next[a]];
    set("blocks", next);
  };

  const save = async () => {
    setBusy(true);
    try {
      const next = await fundRequest<Data>(token, "", { action: "mobile_save", ...f });
      qc.setQueryData(["mobile-admin", token], next);
      qc.invalidateQueries({ queryKey: ["mobile-settings"] });
      setF(next.settings);
      toast({ title: "Мобильная версия сохранена" });
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const free = Object.keys(MOBILE_SECTIONS).filter((id) => !f.tabs.some((t) => t.id === id));
  const blocks = f.blocks.filter((b) => b.tab === open);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white">Мобильная версия</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Отдельная лёгкая версия сайта по адресу <a href="/m" target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">/m</a>. Здесь настраивается нижнее меню и блоки на каждом экране.
          </p>
        </div>
        <Button disabled={busy} className="font-semibold" onClick={save}>
          {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
          Сохранить
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Smartphone" size={15} className="text-primary" /> Общее</h2>
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <Switch checked={f.enabled} onCheckedChange={(v) => set("enabled", v)} />
              Версия открыта
            </label>
          </div>
          {!f.enabled && (
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">Что увидят посетители</span>
              <input className={inputCls} maxLength={200} value={f.message} onChange={(e) => set("message", e.target.value)} placeholder="Например: скоро откроем" />
            </label>
          )}
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Название в шапке</span>
            <input className={inputCls} maxLength={30} value={f.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="flex items-start gap-2 text-sm text-white cursor-pointer">
            <Switch checked={f.redirect} onCheckedChange={(v) => set("redirect", v)} className="mt-0.5" />
            <span>
              Автопереход с телефонов
              <span className="block text-[11px] text-muted-foreground">Посетителей с телефона с главной страницы перенаправляет на /m. Включайте, когда версия будет готова.</span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <Switch checked={f.bigButtons} onCheckedChange={(v) => set("bigButtons", v)} />
            Крупные кнопки в нижнем меню
          </label>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="PanelBottom" size={15} className="text-primary" /> Нижнее меню (до 6 пунктов)</h2>
          {f.tabs.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg bg-rail/50 px-2 py-1.5">
              <Icon name={t.icon || MOBILE_SECTIONS[t.id]?.icon || "Circle"} size={16} className="text-primary flex-shrink-0" fallback="Circle" />
              <input className={`${inputCls} h-8`} maxLength={16} value={t.label} placeholder={MOBILE_SECTIONS[t.id]?.label} onChange={(e) => setTab(t.id, { label: e.target.value })} />
              <span className="text-[10px] text-muted-foreground hidden sm:block w-16 truncate">{MOBILE_SECTIONS[t.id]?.label}</span>
              <button className="text-muted-foreground hover:text-white disabled:opacity-30" disabled={i === 0} onClick={() => moveTab(i, -1)} aria-label="Выше"><Icon name="ChevronUp" size={16} /></button>
              <button className="text-muted-foreground hover:text-white disabled:opacity-30" disabled={i === f.tabs.length - 1} onClick={() => moveTab(i, 1)} aria-label="Ниже"><Icon name="ChevronDown" size={16} /></button>
              <Switch checked={t.enabled} onCheckedChange={(v) => setTab(t.id, { enabled: v })} />
              <button className="text-muted-foreground hover:text-[#EA3943]" onClick={() => set("tabs", f.tabs.filter((x) => x.id !== t.id))} aria-label="Убрать"><Icon name="X" size={16} /></button>
            </div>
          ))}
          {f.tabs.length < 6 && free.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {free.map((id) => (
                <button key={id} onClick={() => addTab(id)} className="text-xs rounded-full border border-dashed border-border px-2.5 py-1 text-muted-foreground hover:text-white hover:border-primary inline-flex items-center gap-1">
                  <Icon name="Plus" size={11} /> {MOBILE_SECTIONS[id].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2 mr-2"><Icon name="LayoutGrid" size={15} className="text-primary" /> Блоки на экране</h2>
          {Object.entries(MOBILE_SECTIONS).map(([id, m]) => (
            <button
              key={id}
              onClick={() => setOpen(id)}
              className={`text-xs rounded-full px-3 py-1 border transition-colors ${open === id ? "bg-white text-black border-white" : "border-input text-muted-foreground hover:text-white"}`}
            >
              {m.label} <span className="font-mono opacity-60">{f.blocks.filter((b) => b.tab === id).length}</span>
            </button>
          ))}
        </div>

        <div className="grid xl:grid-cols-[1fr_300px] gap-4 items-start">
          <div className="space-y-2">
            {blocks.length === 0 && <p className="text-sm text-muted-foreground">Блоков пока нет. Добавьте пустой, и мы заполним его вместе.</p>}
            {blocks.map((b, i) => (
              <div key={b.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select className={`${inputCls} flex-1`} value={b.kind} onChange={(e) => setBlock(b.id, { kind: e.target.value as MobileBlock["kind"] })}>
                    {Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <button className="text-muted-foreground hover:text-white disabled:opacity-30" disabled={i === 0} onClick={() => moveBlock(b.id, -1)} aria-label="Выше"><Icon name="ChevronUp" size={16} /></button>
                  <button className="text-muted-foreground hover:text-white disabled:opacity-30" disabled={i === blocks.length - 1} onClick={() => moveBlock(b.id, 1)} aria-label="Ниже"><Icon name="ChevronDown" size={16} /></button>
                  <Switch checked={b.enabled} onCheckedChange={(v) => setBlock(b.id, { enabled: v })} />
                  <button className="text-muted-foreground hover:text-[#EA3943]" onClick={() => set("blocks", f.blocks.filter((x) => x.id !== b.id))} aria-label="Удалить блок"><Icon name="Trash2" size={15} /></button>
                </div>
                {b.kind !== "empty" && b.kind !== "market_summary" && (
                  <>
                    <input className={inputCls} maxLength={60} placeholder="Заголовок" value={b.title} onChange={(e) => setBlock(b.id, { title: e.target.value })} />
                    <textarea className={`${inputCls} h-20 py-2 resize-none`} maxLength={400} placeholder="Текст" value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />
                    <input className={inputCls} maxLength={300} placeholder="Ссылка: /community или https://…" value={b.url} onChange={(e) => setBlock(b.id, { url: e.target.value })} />
                  </>
                )}
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => addBlock(open)}>
              <Icon name="Plus" size={14} className="mr-1" /> Добавить блок
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-background p-3 space-y-2 xl:sticky xl:top-4">
            <div className="text-[10px] text-muted-foreground text-center">Так будет выглядеть экран «{MOBILE_SECTIONS[open].label}»</div>
            {blocks.filter((b) => b.enabled).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground py-8">Здесь пока ничего нет</div>
            ) : (
              blocks.filter((b) => b.enabled).map((b) => <MobileBlockView key={b.id} block={b} preview />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileManager;
