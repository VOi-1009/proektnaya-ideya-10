import Icon from "@/components/ui/icon";
import { isPrivileged, levelInfo } from "@/lib/status";
import UserAvatar from "./UserAvatar";
import AvatarFrame from "./AvatarFrame";

interface Props {
  name: string;
  level: number;
  avatar?: string;
  className?: string;
  iconSize?: number;
  online?: boolean;
  dot?: "sm" | "md" | "lg";
  frame?: boolean;
  userId?: number | null;
}

const MemberIcon = ({ name, level, avatar, className = "w-5 h-5 text-[9px]", iconSize = 11, online, dot, frame = true, userId }: Props) => {
  const l = levelInfo(level);
  const lv = frame ? level : undefined;
  if (isPrivileged(level) && !avatar)
    return (
      <AvatarFrame userId={userId} level={lv} online={online} dot={dot}>
        <span className={`inline-flex items-center justify-center rounded-full flex-shrink-0 ${l.cls} ${className}`} title={l.title}>
          <Icon name={l.icon} size={iconSize} />
        </span>
      </AvatarFrame>
    );
  return <UserAvatar name={name} avatar={avatar} className={className} level={lv} online={online} dot={dot} userId={userId} />;
};

export default MemberIcon;
