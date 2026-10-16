import { ReactNode } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  author: string;
  time: string;
  avatar?: string;
  avatarClass?: string;
  icon?: string;
  bot?: boolean;
  role?: { label: string; className: string };
  children: ReactNode;
  delay?: number;
}

const Message = ({ author, time, avatar, avatarClass, icon, bot, role, children, delay = 0 }: Props) => (
  <div
    className="group flex gap-3 sm:gap-4 px-2 sm:px-4 py-1.5 -mx-2 sm:-mx-4 hover:bg-black/10 rounded animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 font-display text-sm ${
        avatarClass ?? "bg-primary text-primary-foreground"
      }`}
    >
      {icon ? <Icon name={icon} size={18} /> : avatar}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span className={`font-semibold text-sm sm:text-base ${role?.className ?? "text-white"}`}>{author}</span>
        {bot && (
          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-[1px] rounded flex items-center gap-0.5">
            <Icon name="Check" size={10} />
            БОТ
          </span>
        )}
        {role && !bot && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-input rounded px-1">
            {role.label}
          </span>
        )}
        <span className="text-muted-foreground text-xs">{time}</span>
      </div>
      <div className="text-foreground text-sm sm:text-[15px] leading-relaxed">{children}</div>
    </div>
  </div>
);

export default Message;
