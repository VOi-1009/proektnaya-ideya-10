import Icon from "@/components/ui/icon";

interface Props {
  no?: number | null;
  creator?: boolean;
  compact?: boolean;
  className?: string;
}

const SupporterBadge = ({ no, creator, compact, className = "" }: Props) => {
  if (creator)
    return (
      <span
        title="Создатель проекта TRADERKA.RU"
        className={`inline-flex items-center gap-1 rounded-full font-semibold leading-none flex-shrink-0 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white shadow-[0_0_10px_rgba(167,139,250,0.55)] ${
          compact ? "px-1.5 py-1 text-[9px]" : "px-2 py-1 text-[10px]"
        } ${className}`}
      >
        <Icon name="Crown" size={compact ? 10 : 12} />
        {!compact && "Создатель проекта"}
      </span>
    );
  if (!no) return null;
  return (
    <span
      title={`Поддержал проект — №${no}`}
      className={`inline-flex items-center gap-1 rounded-full font-semibold leading-none flex-shrink-0 bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.35)] ${
        compact ? "px-1.5 py-[3px] text-[9px]" : "px-2 py-[3px] text-[10px]"
      } ${className}`}
    >
      <Icon name="Heart" size={compact ? 10 : 12} className="fill-emerald-300 text-emerald-300" />
      {!compact && "Поддержал проект"}
    </span>
  );
};

export default SupporterBadge;
