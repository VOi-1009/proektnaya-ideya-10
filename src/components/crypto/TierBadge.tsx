import Icon from "@/components/ui/icon";
import { tierOf } from "@/lib/plans";

const TierBadge = ({ tier, compact, className = "" }: { tier?: number | null; compact?: boolean; className?: string }) => {
  const t = tierOf(tier);
  if (!t) return null;
  return (
    <span
      title={`Подписка «${t.name}»`}
      className={`inline-flex items-center gap-1 rounded-full font-semibold leading-none flex-shrink-0 ${t.badge} ${
        compact ? "px-1.5 py-1 text-[9px]" : "px-2 py-1 text-[10px]"
      } ${className}`}
    >
      <Icon name={t.icon} size={compact ? 10 : 12} />
      {t.name}
    </span>
  );
};

export default TierBadge;
