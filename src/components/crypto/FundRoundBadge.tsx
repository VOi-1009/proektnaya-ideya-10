import Icon from "@/components/ui/icon";
import { fundFmt, fundTierOf, useFundDonors } from "@/lib/fund";

interface Props {
  userId?: number | null;
  size?: number;
  className?: string;
}

const FundRoundBadge = ({ userId, size = 28, className = "" }: Props) => {
  const { data } = useFundDonors();
  const amount = userId ? data?.[String(userId)] ?? 0 : 0;
  const tier = fundTierOf(amount);
  if (!tier) return null;
  return (
    <span
      title={`${tier.title} — внёс в фонд ${fundFmt(amount)} TKA`}
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 bg-gradient-to-br ${tier.color} text-black shadow-[0_0_10px_rgba(251,191,36,0.45)] ring-1 ring-white/30 ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon name={tier.icon} size={Math.round(size * 0.55)} fallback="Landmark" />
    </span>
  );
};

export default FundRoundBadge;
