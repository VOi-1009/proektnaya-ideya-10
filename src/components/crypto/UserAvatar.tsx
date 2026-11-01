import AvatarFrame from "./AvatarFrame";

interface Props {
  level?: number;
  online?: boolean;
  dot?: "sm" | "md" | "lg";
  name?: string;
  email?: string;
  avatar?: string;
  className?: string;
  userId?: number | null;
}

const UserAvatar = ({ name, email, avatar, className = "w-8 h-8 text-sm", level, online, dot, userId }: Props) => {
  const letter = (name || email || "Г").trim()[0]?.toUpperCase() ?? "Г";
  const node = avatar ? (
    <img src={avatar} alt={name || "Аватар"} className={`rounded-full object-cover flex-shrink-0 ${className}`} />
  ) : (
    <div className={`rounded-full bg-primary text-white font-display flex items-center justify-center flex-shrink-0 ${className}`}>
      {letter}
    </div>
  );
  if (level === undefined && online === undefined) return node;
  return (
    <AvatarFrame userId={userId} level={level} online={online} dot={dot}>
      {node}
    </AvatarFrame>
  );
};

export default UserAvatar;
