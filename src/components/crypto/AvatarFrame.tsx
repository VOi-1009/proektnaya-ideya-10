import { FRAME_STYLE, useUserCosmetics } from "@/lib/shop";
import { useVerifiedIds } from "@/lib/users";
import Icon from "@/components/ui/icon";
import { statusColor } from "@/lib/status";

interface Props {
  userId?: number | null;
  level?: number;
  online?: boolean;
  dot?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const TOP = {
  sm: "-top-0.5 -right-0.5 w-2 h-2",
  md: "-top-0.5 -right-0.5 w-3 h-3",
  lg: "top-1 right-1 w-4 h-4",
};

const DOT = {
  sm: "-bottom-0.5 -right-0.5 w-2 h-2",
  md: "-bottom-0.5 -right-0.5 w-3 h-3",
  lg: "bottom-1 right-1 w-4 h-4",
};

const AvatarFrame = ({ userId, level, online, dot = "md", children }: Props) => {
  const custom = useUserCosmetics(userId).frame;
  const { data: verified } = useVerifiedIds();
  const isVerified = !!userId && !!verified?.has(userId);
  const fs = custom ? FRAME_STYLE[custom.slug] : undefined;
  const style: React.CSSProperties | undefined = fs
    ? fs.background
      ? { background: fs.background, padding: 3 }
      : { outline: `3px solid ${fs.ring}`, outlineOffset: "2px", boxShadow: fs.boxShadow }
    : level
    ? { outline: `2px solid ${statusColor(level)}`, outlineOffset: "2px" }
    : undefined;
  return (
  <span className="relative inline-flex rounded-full flex-shrink-0" style={style}>
    {children}
    {isVerified && (
      <span
        className={`absolute rounded-full ring-2 ring-card bg-sky-500 text-white flex items-center justify-center ${TOP[dot]}`}
        title="Аккаунт подтверждён"
      >
        <Icon name="Check" size={dot === "sm" ? 6 : dot === "md" ? 8 : 11} strokeWidth={4} />
      </span>
    )}
    {online !== undefined && (
      <span
        className={`absolute rounded-full ring-2 ring-card ${DOT[dot]} ${
          online ? "bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.9)]" : "bg-black"
        }`}
        title={online ? "В сети" : "Не в сети"}
      />
    )}
  </span>
  );
};

export default AvatarFrame;
