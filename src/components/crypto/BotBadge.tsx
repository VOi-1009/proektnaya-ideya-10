import Icon from "@/components/ui/icon";

const BotBadge = ({ ai, compact, className = "" }: { ai?: boolean; compact?: boolean; className?: string }) => (
  <span
    title={ai ? "ИИ-бот TRADERKA.RU — всегда в сети" : "Бот"}
    className={`inline-flex items-center gap-0.5 rounded font-bold uppercase leading-none flex-shrink-0 ${
      ai ? "bg-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.6)]" : "bg-slate-500/30 text-slate-200"
    } ${compact ? "px-1 py-[3px] text-[8px]" : "px-1.5 py-1 text-[9px]"} ${className}`}
  >
    <Icon name={ai ? "Sparkles" : "Bot"} size={compact ? 9 : 10} />
    бот
  </span>
);

export default BotBadge;
