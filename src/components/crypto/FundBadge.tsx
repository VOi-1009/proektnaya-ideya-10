import Icon from "@/components/ui/icon";
import { fundFmt, fundTierOf, useFundDonors } from "@/lib/fund";

interface Props {
  userId?: number | null;
  compact?: boolean;
  className?: string;
}

const FundBadge = ({ userId, compact, className = "" }: Props) => {
  const { data } = useFundDonors();
  const amount = userId ? data?.[String(userId)] ?? 0 : 0;
  const tier = fundTierOf(amount);
  if (!tier) return null;
  return (
    <span
      title={`${tier.title} — внёс в фонд ${fundFmt(amount)} TKA`}
      className={`inline-flex items-center gap-1 rounded-full font-semibold leading-none flex-shrink-0 bg-gradient-to-br ${tier.color} text-black ${
        compact ? "px-1.5 py-1 text-[9px]" : "px-2 py-1 text-[10px]"
      } ${className}`}
    >
      <Icon name={tier.icon} size={compact ? 10 : 12} fallback="Landmark" />
      {!compact && tier.title}
    </span>
  );
};

export default FundBadge;
