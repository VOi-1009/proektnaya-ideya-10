import Icon from "@/components/ui/icon";
import { levelInfo } from "@/lib/status";

interface Props {
  level?: number;
  compact?: boolean;
  className?: string;
}

const StatusBadge = ({ level, compact, className = "" }: Props) => {
  if (!level) return null;
  const l = levelInfo(level);
  return (
    <span
      title={l.title}
      className={`inline-flex items-center gap-1 rounded-full font-semibold leading-none flex-shrink-0 ${
        compact ? "px-1.5 py-1 text-[10px]" : "px-2 py-1 text-[11px]"
      } ${l.cls} ${className}`}
    >
      <Icon name={l.icon} size={compact ? 10 : 12} />
      {l.title}
    </span>
  );
};

export default StatusBadge;
