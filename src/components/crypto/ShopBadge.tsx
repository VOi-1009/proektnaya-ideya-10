import { useUserCosmetics } from "@/lib/shop";

interface Props {
  userId?: number | null;
  size?: number;
  className?: string;
}

const ShopBadge = ({ userId, size = 16, className = "" }: Props) => {
  const c = useUserCosmetics(userId).badge;
  if (!c?.emoji) return null;
  return (
    <span
      title={c.name}
      aria-label={c.name}
      className={`inline-flex items-center justify-center flex-shrink-0 leading-none ${className}`}
      style={{ fontSize: Math.round(size * 0.85), width: size, height: size }}
    >
      {c.emoji}
    </span>
  );
};

export default ShopBadge;
