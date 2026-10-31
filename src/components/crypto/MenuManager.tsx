import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { useRadars } from "@/lib/radars";
import { useChatRooms } from "@/lib/chat";
import { DEFAULT_MENU_TITLE, MenuEntry, MenuSettings, mergeMenu, menuRequest, useMenuSettings } from "@/lib/menu";

const inputCls =
  "w-full bg-rail rounded px-3 h-9 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const COLORS = ["#FFFFFF", "#F97316", "#EA3943", "#F472B6", "#A78BFA", "#60A5FA", "#22D3EE", "#34D399", "#22C55E", "#FACC15"];

const ICONS = [
  "Home", "LineChart", "BarChart3", "PieChart", "TrendingUp", "Activity", "Newspaper", "FileText", "BookOpen", "Sparkles",
  "Bot", "Brain", "MessagesSquare", "MessageCircle", "Users", "Bell", "Wallet", "Coins", "Bitcoin", "ArrowRightLeft",
  "Calculator", "Calendar", "Clock", "Trophy", "Award", "Crown", "Star", "Heart", "HeartHandshake", "Gift",
  "Flame", "Zap", "Rocket", "Gem", "Target", "Lightbulb", "Globe", "Map", "Compass", "Info",
  "Shield", "Lock", "Search", "Radar", "Layers", "LayoutGrid", "Megaphone", "Link", "Hash", "Circle",
];

const KIND_LABEL: Record<MenuEntry["kind"], string> = { base: "Пункт", tool: "Инструмент", radar: "Радар", chat: "Чат" };

const IconPicker = ({ value, onPick }: { value: string; onPick: (v: string) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" className="w-9 h-9 rounded bg-rail flex items-center justify-center text-muted-foreground hover:text-white flex-shrink-0" title="Иконка">
        {value ? <Icon name={value} size={16} fallback="Circle" /> : <span className="text-[10px]">точка</span>}
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-72 p-2 bg-card border-border">
      <button
        type="button"
        onClick={() => onPick("")}
        className={`w-full mb-2 text-xs rounded px-2 py-1.5 text-left hover:bg-hover ${value === "" ? "text-white bg-hover/60" : "text-muted-foreground"}`}
      >
        Цветная точка (стандартно)
      </button>
      <div className="grid grid-cols-8 gap-1">
        {ICONS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            title={n}
            className={`w-8 h-8 rounded flex items-center justify-center hover:bg-hover ${value === n ? "bg-hover text-white" : "text-muted-foreground"}`}
          >
            <Icon name={n} size={16} />
          </button>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);

const ColorPicker = ({ value, fallback, onPick }: { value: string; fallback: string; onPick: (v: string) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" className="w-9 h-9 rounded bg-rail flex items-center justify-center flex-shrink-0" title="Цвет">
        <span className="w-4 h-4 rounded-full border border-white/20" style={{ background: value || fallback }} />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-56 p-3 bg-card border-border space-y-2">
      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className={`w-6 h-6 rounded-full border-2 ${value.toLowerCase() === c.toLowerCase() ? "border-white" : "border-transparent"}`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
        <label className="relative w-6 h-6 rounded-full border-2 border-dashed border-input flex items-center justify-center cursor-pointer" title="Свой цвет">
          <Icon name="Pipette" size={11} className="text-muted-foreground" />
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#F97316"} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
      </div>
      <button type="button" onClick={() => onPick("")} className="text-xs text-muted-foreground hover:text-white">
        Сбросить на стандартный
      </button>
    </PopoverContent>
  </Popover>
);

const MenuManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useMenuSettings();
  const { data: radars, isFetched: radarsReady } = useRadars();
  const { data: chats, isFetched: chatsReady } = useChatRooms();
  const [items, setItems] = useState<MenuEntry[] | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && radarsReady && chatsReady && !items) {
      setItems(mergeMenu(data, radars, chats));
      setTitle(data.menuTitle ?? "");
    }
  }, [data, radars, chats, radarsReady, chatsReady, items]);

  if (!items) return <p className="text-muted-foreground text-sm">Загружаю…</p>;

  const patch = (idx: number, p: Partial<MenuEntry>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...p } : it)));

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        menuTitle: title,
        items: items.map(({ id, label, hidden, icon, color }) => ({ id, label, hidden, icon, color })),
      };
      const { menu } = await menuRequest<{ menu: MenuSettings }>(token, body);
      qc.setQueryData(["menu-settings"], menu);
      setItems(mergeMenu(menu, radars, chats));
      toast({ title: "Меню сохранено" });
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setTitle("");
    setItems(mergeMenu(null, radars, chats));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Меню слева</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Весь список в одном месте: пункты, инструменты, радары и чаты. Меняйте порядок стрелками, название, иконку и цвет, скрывайте лишнее глазом. Пустое название — стандартное. Сами радары и чаты создаются во вкладках «Радары» и «Чаты».
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-1">
        <span className="text-xs text-muted-foreground">Заголовок меню</span>
        <input className={`${inputCls} max-w-sm`} value={title} maxLength={40} placeholder={DEFAULT_MENU_TITLE} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h2 className="text-white font-semibold text-sm">Пункты ({items.length})</h2>
        {items.map((it, idx) => (
          <div key={it.id} className={`flex items-center gap-2 ${it.hidden ? "opacity-50" : ""}`}>
            <div className="flex flex-col">
              <button type="button" disabled={idx === 0} onClick={() => move(idx, -1)} className="text-muted-foreground hover:text-white disabled:opacity-30" aria-label="Выше">
                <Icon name="ChevronUp" size={16} />
              </button>
              <button type="button" disabled={idx === items.length - 1} onClick={() => move(idx, 1)} className="text-muted-foreground hover:text-white disabled:opacity-30" aria-label="Ниже">
                <Icon name="ChevronDown" size={16} />
              </button>
            </div>
            <IconPicker value={it.icon || it.defIcon} onPick={(v) => patch(idx, { icon: v })} />
            <ColorPicker value={it.color} fallback={it.defColor.startsWith("hsl") ? "#F97316" : it.defColor} onPick={(v) => patch(idx, { color: v })} />
            <input className={inputCls} value={it.label} maxLength={60} placeholder={it.name} onChange={(e) => patch(idx, { label: e.target.value })} />
            <span className="hidden sm:block text-[10px] uppercase tracking-wider text-muted-foreground w-20 flex-shrink-0">{KIND_LABEL[it.kind]}</span>
            <button type="button" onClick={() => patch(idx, { hidden: !it.hidden })} className="text-muted-foreground hover:text-white p-1.5" title={it.hidden ? "Показать" : "Скрыть"}>
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
