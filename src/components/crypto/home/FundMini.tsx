import Icon from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { fundFmt, useFund } from "@/lib/fund";
import TkaIcon from "../TkaIcon";

const short = (v: number) => v.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

const FundMini = ({ onOpen }: { onOpen: () => void }) => {
  const { token } = useAuth();
  const { data: f } = useFund(token);
  if (!f) return <div className="h-full min-h-[100px]" />;
  const pct = f.goal > 0 ? Math.min((f.total / f.goal) * 100, 100) : 0;
  const op = f.last[0];
  const top = f.top[0];

  return (
    <button onClick={onOpen} className="w-full h-full text-left px-4 py-3 flex flex-col gap-2 hover:bg-hover/40 transition-colors" aria-label="Открыть общий фонд">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon name="Landmark" size={14} className="text-primary" />
        <span className="font-semibold text-white">{f.title || "Общий фонд"}</span>
        <Icon name="ChevronRight" size={14} className="ml-auto" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <TkaIcon size={18} className="self-center" />
        <span className="font-display text-2xl text-white leading-none">{fundFmt(f.total)}</span>
        <span className="text-[10px] font-semibold text-primary">TKA</span>
      </div>
      {f.goal > 0 && (
        <div className="space-y-1">
          <Progress value={pct} className="h-1.5 bg-rail" />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{pct.toFixed(1).replace(".", ",")}% цели</span>
            <span>{short(f.goal)}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-md bg-rail/60 px-1 py-1">
          <div className="font-mono text-xs text-white">{short(f.feesPaid ?? 0)}</div>
          <div className="text-[9px] text-muted-foreground leading-tight">комиссии</div>
        </div>
        <div className="rounded-md bg-rail/60 px-1 py-1">
          <div className="font-mono text-xs text-white">{f.donors}</div>
          <div className="text-[9px] text-muted-foreground leading-tight">вкладчиков</div>
        </div>
        <div className="rounded-md bg-rail/60 px-1 py-1">
          <div className="font-mono text-xs text-white">{String(+(f.rate * 100).toFixed(3)).replace(".", ",")}%</div>
          <div className="text-[9px] text-muted-foreground leading-tight">ставка</div>
        </div>
      </div>
      {(top || op) && (
        <div className="text-[10px] text-muted-foreground leading-snug truncate text-center">
          {top ? <>Больше всех вложил <span className="text-white">{top.name}</span>, {short(top.amount)} TKA</> : <>Последнее: {op.note}</>}
        </div>
      )}
    </button>
  );
};

export default FundMini;