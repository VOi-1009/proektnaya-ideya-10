import Icon from "@/components/ui/icon";
import { isPrivileged, levelInfo } from "@/lib/status";
import UserAvatar from "./UserAvatar";

interface Props {
  name: string;
  level: number;
  avatar?: string;
  className?: string;
  iconSize?: number;
}

const MemberIcon = ({ name, level, avatar, className = "w-5 h-5 text-[9px]", iconSize = 11 }: Props) => {
  const l = levelInfo(level);
  if (isPrivileged(level))
    return (
      <span className={`inline-flex items-center justify-center rounded-full flex-shrink-0 ${l.cls} ${className}`} title={l.title}>
        <Icon name={l.icon} size={iconSize} />
      </span>
    );
  return <UserAvatar name={name} avatar={avatar} className={className} />;
};

export default MemberIcon;
