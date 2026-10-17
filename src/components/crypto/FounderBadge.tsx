import Icon from "@/components/ui/icon";

interface Props {
  no?: number | null;
  compact?: boolean;
  className?: string;
}

const FounderBadge = ({ no, compact, className = "" }: Props) => {
  if (!no) return null;
  return (
    <span
      title={`Основатель №${no} — один из первых 100 участников TRADERKA`}
      className={`inline-flex items-center gap-1 rounded-full font-semibold leading-none flex-shrink-0 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black shadow-[0_0_10px_rgba(251,191,36,0.45)] ${
        compact ? "px-1.5 py-1 text-[10px]" : "px-2 py-1 text-[11px]"
      } ${className}`}
    >
      <Icon name="Gem" size={compact ? 10 : 12} />
      {!compact && "Основатель"}
    </span>
  );
};

export default FounderBadge;
