import { useId } from "react";

interface Props {
  size?: number;
  className?: string;
}

const TkaIcon = ({ size = 16, className = "" }: Props) => {
  const gid = `tka-bar-${useId().replace(/:/g, "")}`;
  const glyph = Math.round(size * 0.62);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-primary leading-none flex-shrink-0 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.35)] ${className}`}
      style={{ width: size, height: size }}
      aria-label="TKA"
      role="img"
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#22C55E" />
            <stop offset="0.22" stopColor="#FFFFFF" />
            <stop offset="0.78" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#EA3943" />
          </linearGradient>
        </defs>
        <rect x="2" y="3" width="20" height="5.2" rx="0.8" fill={`url(#${gid})`} />
        <rect x="9.4" y="3" width="5.2" height="18" rx="0.8" fill="#FFFFFF" />
      </svg>
    </span>
  );
};

export default TkaIcon;
