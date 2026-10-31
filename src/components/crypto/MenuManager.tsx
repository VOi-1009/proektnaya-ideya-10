import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  BASE_ITEMS,
  DEFAULT_MENU_TITLE,
  DEFAULT_RADARS_TITLE,
  MenuItemCfg,
  MenuSettings,
  TOOL_IDS,
  mergeMenu,
  menuRequest,
  useMenuSettings,
} from "@/lib/menu";

const inputCls =
  "w-full bg-rail rounded px-3 h-9 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const MenuManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useMenuSettings();
  const [form, setForm] = useState<MenuSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !form) setForm({ ...data, items: mergeMenu(data) });
  }, [data, form]);

  if (!form) return <p className="text-muted-foreground text-sm">Загружаю…</p>;

  const nameOf = (id: string) => BASE_ITEMS.find((i) => i.id === id)?.name ?? id;

  const patch = (idx: number, p: Partial<MenuItemCfg>) =>
    setForm({ ...form, items: form.items.map((it, i) => (i === idx ? { ...it, ...p } : it)) });

  const shown = form.items.map((it, idx) => ({ it, idx })).filter((x) => !TOOL_IDS.includes(x.it.id));

  const move = (idx: number, dir: -1 | 1) => {
    const pos = shown.findIndex((x) => x.idx === idx);
    const j = shown[pos + dir]?.idx;
    if (j === undefined) return;
    const items = [...form.items];
    [items[idx], items[j]] = [items[j], items[idx]];
    setForm({ ...form, items });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { menu } = await menuRequest<{ menu: MenuSettings }>(token, form);
      qc.setQueryData(["menu-settings"], menu);
      setForm({ ...menu, items: mergeMenu(menu) });
      toast({ title: "Меню сохранено" });
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () =>
    setForm({
      items: BASE_ITEMS.map((i) => (TOOL_IDS.includes(i.id) ? form.items.find((x) => x.id === i.id) : undefined) ?? { id: i.id, label: "", hidden: false }),
      menuTitle: "",
      radarsTitle: "",
      radarsFirst: false,
    });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Меню слева</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Меняйте порядок стрелками, скрывайте лишнее глазом и переименовывайте пункты. Пустое название — стандартное. Котировки, портфель, уведомления и конвертер настраиваются во вкладке «Радары».
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">Разделы</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Название раздела с пунктами</span>
            <input className={inputCls} value={form.menuTitle} maxLength={40} placeholder={DEFAULT_MENU_TITLE} onChange={(e) => setForm({ ...form, menuTitle: e.target.value })} />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Название раздела с радарами</span>
            <input className={inputCls} value={form.radarsTitle} maxLength={40} placeholder={DEFAULT_RADARS_TITLE} onChange={(e) => setForm({ ...form, radarsTitle: e.target.value })} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Switch checked={form.radarsFirst} onCheckedChange={(v) => setForm({ ...form, radarsFirst: v })} />
          Показывать радары выше основного меню
        </label>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h2 className="text-white font-semibold text-sm">Пункты</h2>
        {shown.map(({ it, idx }, pos) => (
          <div key={it.id} className={`flex items-center gap-2 ${it.hidden ? "opacity-50" : ""}`}>
            <div className="flex flex-col">
              <button type="button" disabled={pos === 0} onClick={() => move(idx, -1)} className="text-muted-foreground hover:text-white disabled:opacity-30" aria-label="Выше">
                <Icon name="ChevronUp" size={16} />
              </button>
              <button type="button" disabled={pos === shown.length - 1} onClick={() => move(idx, 1)} className="text-muted-foreground hover:text-white disabled:opacity-30" aria-label="Ниже">
                <Icon name="ChevronDown" size={16} />
              </button>
            </div>
            <input className={inputCls} value={it.label} maxLength={60} placeholder={nameOf(it.id)} onChange={(e) => patch(idx, { label: e.target.value })} />
            <button
              type="button"
              onClick={() => patch(idx, { hidden: !it.hidden })}
              className="text-muted-foreground hover:text-white p-1.5"
              title={it.hidden ? "Показать" : "Скрыть"}
            >
              <Icon name={it.hidden ? "EyeOff" : "Eye"} size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} className="font-semibold">
          {saving ? "Сохраняю…" : "Сохранить"}
        </Button>
        <Button variant="outline" onClick={reset} className="bg-transparent border-input hover:bg-hover hover:text-white">
          Сбросить
        </Button>
      </div>
    </div>
  );
};

export default MenuManager;
