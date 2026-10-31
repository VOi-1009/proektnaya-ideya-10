import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Radar, RADAR_COLORS, RADAR_KINDS, RadarKind, radarsRequest } from "@/lib/radars";
import RadarDialog from "./RadarDialog";
import RichEditor from "./RichEditor";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

type Form = { id?: number; title: string; color: string; kind: RadarKind; symbol: string; url: string; description: string; published: boolean; pageTitle: string; pageHtml: string };

const EMPTY: Form = { title: "", color: RADAR_COLORS[1], kind: "liq_heatmap", symbol: "ETHUSDT", url: "", description: "", published: true, pageTitle: "", pageHtml: "" };

const RadarsManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["admin-radars", token];
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Radar | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => radarsRequest<{ radars: Radar[] }>(token, "&admin=1").then((d) => d.radars),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["radars"] });

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const { radar } = await radarsRequest<{ radar: Radar }>(token, "", { action: "save", ...form });
      qc.setQueryData<Radar[]>(key, (old) => (form.id ? old?.map((r) => (r.id === radar.id ? radar : r)) : [...(old ?? []), radar]));
      refresh();
      toast({ title: form.id ? "Радар сохранён" : `Радар «${radar.title}» добавлен` });
      setForm(null);
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const move = async (r: Radar, dir: number) => {
    try {
      const { radars } = await radarsRequest<{ radars: Radar[] }>(token, "", { action: "move", id: r.id, dir });
      qc.setQueryData(key, radars);
      refresh();
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    }
  };

  const remove = async (r: Radar) => {
    if (!window.confirm(`Удалить радар «${r.title}»?`)) return;
    try {
      await radarsRequest(token, "", { action: "delete", id: r.id });
      qc.setQueryData<Radar[]>(key, (old) => old?.filter((x) => x.id !== r.id));
      refresh();
      toast({ title: "Радар удалён" });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    }
  };

  const list = data ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white">Радары</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Радары появляются в левом меню. По клику открывается окно с картой или ссылкой. Порядок, иконку и цвет в меню меняйте во вкладке «Меню слева».
          </p>
        </div>
        {!form && (
          <Button onClick={() => setForm({ ...EMPTY })} className="font-semibold">
            <Icon name="Plus" size={16} className="mr-1.5" />
            Новый радар
          </Button>
        )}
      </div>

      {form && (
        <div className="bg-card border border-primary/50 rounded-lg p-4 space-y-4 animate-fade-in">
          <div className="text-white font-semibold">{form.id ? "Редактирование радара" : "Новый радар"}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Название в меню</span>
              <input
                className={inputCls}
                value={form.title}
                maxLength={80}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="тепловая-карта-ETH"
                autoFocus
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Тип</span>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as RadarKind })}>
                {RADAR_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            {form.kind === "liq_heatmap" ? (
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Тикер фьючерса</span>
                <input
                  className={`${inputCls} font-mono uppercase`}
                  value={form.symbol}
                  maxLength={20}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                  placeholder="BTCUSDT"
                />
                <span className="text-[10px] text-muted-foreground">Например BTCUSDT, ETHUSDT, SOLUSDT, TONUSDT</span>
              </label>
            ) : form.kind === "page" ? (
              <div className="text-xs text-muted-foreground self-end pb-2">Страница откроется прямо на сайте — заполните её ниже</div>
            ) : form.kind === "ex_flows" ? (
              <div className="text-xs text-muted-foreground self-end pb-2">Данные CoinMarketCap, обновляются каждые 5 минут</div>
            ) : form.kind === "top_txs" ? (
              <div className="text-xs text-muted-foreground self-end pb-2">Данные TradingView, обновляются каждые 5 минут</div>
            ) : (
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Ссылка</span>
                <input
                  className={inputCls}
                  value={form.url}
                  maxLength={1000}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                />
              </label>
            )}
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Подзаголовок в окне (необязательно)</span>
              <input
                className={inputCls}
                value={form.description}
                maxLength={500}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>
          {form.kind === "page" && (
            <div className="space-y-3">
              <label className="space-y-1 block">
                <span className="text-xs text-muted-foreground">Заголовок страницы</span>
                <input
                  className={`${inputCls} text-base font-semibold`}
                  value={form.pageTitle}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, pageTitle: e.target.value })}
                  placeholder="Например: Как читать тепловую карту"
                />
              </label>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Текст страницы — выделите текст и выберите оформление, или вставьте HTML-код</span>
                <RichEditor value={form.pageHtml} onChange={(pageHtml) => setForm((f) => (f ? { ...f, pageHtml } : f))} />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Цвет точки</span>
            <div className="flex items-center gap-2 flex-wrap">
              {RADAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
              <label className="relative w-7 h-7 rounded-full border-2 border-dashed border-input flex items-center justify-center cursor-pointer" title="Свой цвет">
                <Icon name="Pipette" size={12} className="text-muted-foreground" />
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              <span className="ml-2 flex items-center gap-2 text-sm text-foreground bg-rail rounded px-2 py-1">
                <span className="w-2 h-2 rounded-full" style={{ background: form.color }} />
                {form.title || "название"}
              </span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            Показывать на сайте
          </label>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="font-semibold">
              {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
              {form.id ? "Сохранить" : "Добавить"}
            </Button>
            <Button variant="outline" onClick={() => setForm(null)} className="bg-transparent border-input hover:bg-hover hover:text-white">
              Отмена
            </Button>
          </div>
        </div>
      )}

      {isLoading && <Skeleton className="h-32 w-full bg-card" />}
      {isError && <div className="text-down text-sm">Не удалось загрузить радары.</div>}

      <div className="space-y-2">
        {list.map((r, i) => (
          <div key={r.id} className={`bg-card border border-border rounded-lg p-3 flex items-center gap-3 ${r.published ? "" : "opacity-60"}`}>
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{r.title}</div>
              <div className="text-muted-foreground text-xs truncate">
                {RADAR_KINDS.find((k) => k.id === r.kind)?.label}
                {r.kind === "liq_heatmap" ? ` · ${r.symbol}` : r.kind === "link" ? ` · ${r.url}` : ""}
                {!r.published && " · скрыт"}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                disabled={i === 0}
                onClick={() => move(r, -1)}
                className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-hover disabled:opacity-30"
                title="Выше"
              >
                <Icon name="ChevronUp" size={16} />
              </button>
              <button
                disabled={i === list.length - 1}
                onClick={() => move(r, 1)}
                className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-hover disabled:opacity-30"
                title="Ниже"
              >
                <Icon name="ChevronDown" size={16} />
              </button>
              <button onClick={() => setPreview(r)} className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-hover" title="Посмотреть">
                <Icon name="Eye" size={16} />
              </button>
              <button
                onClick={() => setForm({ id: r.id, title: r.title, color: r.color, kind: r.kind, symbol: r.symbol, url: r.url, description: r.description, published: r.published, pageTitle: r.pageTitle ?? "", pageHtml: r.pageHtml ?? "" })}
                className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-hover"
                title="Изменить"
              >
                <Icon name="Pencil" size={16} />
              </button>
              <button onClick={() => remove(r)} className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-down hover:bg-down/10" title="Удалить">
                <Icon name="Trash2" size={16} />
              </button>
            </div>
          </div>
        ))}
        {data && !list.length && !form && <div className="text-muted-foreground text-sm">Радаров нет — нажмите «Новый радар».</div>}
      </div>

      <RadarDialog radar={preview} onClose={() => setPreview(null)} />
    </div>
  );
};

export default RadarsManager;
