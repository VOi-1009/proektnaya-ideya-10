import { fgBorder, fgColor, useFearGreed } from "@/lib/fearGreed";
import { cardCls, labelCls, valueCls } from "./summaryCard";

const FearGreedCard = () => {
  const { data: fg } = useFearGreed();
  return (
    <div
      className={cardCls(fg ? fgBorder(fg.value) : "border-input")}
      title={`Индекс страха и жадности крипторынка: 0 — паника, 100 — эйфория${fg?.prev != null ? `. Вчера: ${fg.prev}` : ""}`}
    >
      <div className={labelCls}>Страх и жадность</div>
      {fg ? (
        <>
          <div className="flex items-baseline gap-1.5 mt-0.5 w-full min-w-0">
            <span className={`font-mono tabular text-sm leading-tight ${fgColor(fg.value)}`}>{fg.value}</span>
            <span className="text-white text-[10px] truncate">{fg.label}</span>
          </div>
          <div className="relative h-1 rounded-full mt-1 w-full bg-gradient-to-r from-down via-accent to-up">
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border border-background"
              style={{ left: `${fg.value}%` }}
            />
          </div>
        </>
      ) : (
        <div className={valueCls}>—</div>
      )}
    </div>
  );
};

export default FearGreedCard;
