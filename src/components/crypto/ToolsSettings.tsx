import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { BASE_ITEMS, MenuItemCfg, MenuSettings, TOOL_IDS, mergeMenu, menuRequest, useMenuSettings } from "@/lib/menu";

const inputCls =
  "w-full bg-rail rounded px-3 h-9 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const ToolsSettings = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useMenuSettings();
  const [items, setItems] = useState<MenuItemCfg[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !items) setItems(mergeMenu(data));
  }, [data, items]);

  if (!items) return null;

  const nameOf = (id: string) => BASE_ITEMS.find((i) => i.id === id)?.name ?? id;
  const tools = items.map((it, idx) => ({ it, idx })).filter((x) => TOOL_IDS.includes(x.it.id));

  const patch = (idx: number, p: Partial<MenuItemCfg>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...p } : it)));

  const move = (pos: number, dir: -1 | 1) => {
    const a = tools[pos];
    const b = tools[pos + dir];
    if (!a || !b) return;
    const next = [...items];
    [next[a.idx], next[b.idx]] = [next[b.idx], next[a.idx]];
    setItems(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body: MenuSettings = { menuTitle: "", radarsTitle: "", radarsFirst: false, ...(data ?? {}), items };
      const { menu } = await menuRequest<{ menu: MenuSettings }>(token, body);
      qc.setQueryData(["menu-settings"], menu);
      setItems(mergeMenu(menu));
      toast({ title: "Инструменты сохранены" });
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-2">
      <h2 className="text-white font-semibold text-sm">Встроенные инструменты</h2>
      <p className="text-muted-foreground text-xs mb-2">Стоят в блоке выше радаров. Меняйте порядок, переименовывайте и скрывайте. Пустое название — стандартное.</p>
      {tools.map(({ it, idx }, pos) => (
        <div key={it.id} className={`flex items-center gap-2 ${it.hidden ? "opacity-50" : ""}`}>
          <div className="flex flex-col">
            <button type="button" disabled={pos === 0} onClick={() => move(pos, -1)} className="text-muted-foreground hover:text-white disabled:opacity-30" aria-label="Выше">
              <Icon name="ChevronUp" size={16} />
            </button>
            <button type="button" disabled={pos === tools.length - 1} onClick={() => move(pos, 1)} className="text-muted-foreground hover:text-white disabled:opacity-30" aria-label="Ниже">
              <Icon name="ChevronDown" size={16} />
            </button>
          </div>
          <input className={inputCls} value={it.label} maxLength={60} placeholder={nameOf(it.id)} onChange={(e) => patch(idx, { label: e.target.value })} />
          <button type="button" onClick={() => patch(idx, { hidden: !it.hidden })} className="text-muted-foreground hover:text-white p-1.5" title={it.hidden ? "Показать" : "Скрыть"}>
            <Icon name={it.hidden ? "EyeOff" : "Eye"} size={18} />
          </button>
        </div>
      ))}
      <Button onClick={save} disabled={saving} size="sm" className="font-semibold mt-2">
        {saving ? "Сохраняю…" : "Сохранить"}
      </Button>
    </div>
  );
};

export default ToolsSettings;
