import { statusColor } from "@/lib/status";

interface Props {
  level?: number;
  online?: boolean;
  children: React.ReactNode;
}

const AvatarFrame = ({ level, online, children }: Props) => (
  <span
    className="relative inline-flex rounded-full flex-shrink-0"
    style={level ? { outline: `2px solid ${statusColor(level)}`, outlineOffset: "2px" } : undefined}
  >
    {children}
    {online !== undefined && (
      <span
        className={`absolute bottom-0 right-0 w-[24%] h-[24%] min-w-[8px] min-h-[8px] rounded-full ring-2 ring-card ${
          online ? "bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.9)]" : "bg-black"
        }`}
        title={online ? "В сети" : "Не в сети"}
      />
    )}
  </span>
);

export default AvatarFrame;
