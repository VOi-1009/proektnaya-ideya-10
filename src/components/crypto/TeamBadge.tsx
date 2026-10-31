import Icon from "@/components/ui/icon";
import { TEAMS } from "@/lib/status";

interface Props {
  team?: string;
  compact?: boolean;
  className?: string;
}

const TeamBadge = ({ team, compact, className = "" }: Props) => {
  if (team !== "bull" && team !== "bear") return null;
  const t = TEAMS[team];
  return (
    <span
      title={`Команда «${t.title}»`}
      className={`inline-flex items-center gap-1 rounded-full font-semibold leading-none flex-shrink-0 ${t.cls} ${
        compact ? "px-1.5 py-1 text-[9px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
    >
      <Icon name={t.icon} size={compact ? 10 : 12} />
      {!compact && t.title}
    </span>
  );
};

export default TeamBadge;
