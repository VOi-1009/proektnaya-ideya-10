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
      <img src={team === "bull" ? "/icons/bull.png" : "/icons/bear.png"} alt="" className={`rounded-full object-cover ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      {!compact && t.title}
    </span>
  );
};

export default TeamBadge;
