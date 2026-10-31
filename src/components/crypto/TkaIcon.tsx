interface Props {
  size?: number;
  className?: string;
}

const TkaIcon = ({ size = 16, className = "" }: Props) => (
  <span
    className={`inline-flex items-center justify-center rounded-full bg-primary text-white font-display font-black leading-none flex-shrink-0 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.35)] ${className}`}
    style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}
    aria-label="TKA"
  >
    Т
  </span>
);

export default TkaIcon;
