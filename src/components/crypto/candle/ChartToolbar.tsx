import Icon from "@/components/ui/icon";
import { fmtPrice } from "@/lib/crypto";

interface Props {
  coinId: string;
  price: number;
  onQuick?: (side: "long" | "short") => void;
  quickInfo?: string;
  quickDisabled?: boolean;
  closeInfo?: string;
  closeProfit?: boolean;
  onCloseAll?: () => void;
  closeDisabled?: boolean;
  zoom: (factor: number, ratio?: number) => void;
  autoFit: boolean;
  setAutoFit: (fn: (v: boolean) => boolean) => void;
  resetAll: () => void;
  full: boolean;
  setFull: (fn: (v: boolean) => boolean) => void;
}

const ChartToolbar = ({ coinId, price, onQuick, quickInfo, quickDisabled, closeInfo, closeProfit, onCloseAll, closeDisabled, zoom, autoFit, setAutoFit, resetAll, full, setFull }: Props) => (
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display text-white">График</h3>
          <span className="font-mono text-white text-sm">{price ? fmtPrice(price, coinId) : "—"}</span>
          {onQuick && (
            <>
              <button disabled={quickDisabled} onClick={() => onQuick("long")} className="px-3 py-1 text-xs font-medium rounded bg-[#22C55E] text-black hover:bg-[#22C55E]/90 disabled:opacity-50">Лонг</button>
              <button disabled={quickDisabled} onClick={() => onQuick("short")} className="px-3 py-1 text-xs font-medium rounded bg-[#EA3943] text-white hover:bg-[#EA3943]/90 disabled:opacity-50">Шорт</button>
              {quickInfo && <span className="text-xs text-muted-foreground">{quickInfo}</span>}
              {onCloseAll && closeInfo && (
                <button disabled={closeDisabled} onClick={onCloseAll} className="px-3 py-1 text-xs font-medium rounded border border-border text-white hover:bg-hover disabled:opacity-50">
                  Закрыть позицию <span className={closeProfit ? "text-[#22C55E]" : "text-[#EA3943]"}>{closeInfo}</span>
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
        <div className="flex bg-rail rounded p-0.5">
          <button onClick={() => zoom(1 / 1.5)} title="Приблизить" className="px-2 py-1 text-muted-foreground hover:text-white"><Icon name="ZoomIn" size={14} /></button>
          <button onClick={() => zoom(1.5)} title="Отдалить" className="px-2 py-1 text-muted-foreground hover:text-white"><Icon name="ZoomOut" size={14} /></button>
          <button
            onClick={() => setAutoFit((v) => !v)}
            title="Автоподгонка: все видимые свечи и цена ликвидации помещаются на экран"
            className={`px-2 py-1 text-xs font-mono flex items-center gap-1 rounded ${autoFit ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"}`}
          >
            <Icon name="ChevronsUpDown" size={14} /> Авто
          </button>
          <button onClick={resetAll} title="Сбросить масштаб" className="px-2 py-1 text-muted-foreground hover:text-white"><Icon name="RotateCcw" size={14} /></button>
          <button onClick={() => setFull((v) => !v)} title={full ? "Свернуть (Esc)" : "На весь экран"} className={`px-2 py-1 rounded ${full ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"}`}><Icon name={full ? "Shrink" : "Expand"} size={14} /></button>
        </div>
        </div>
      </div>
);

export default ChartToolbar;
