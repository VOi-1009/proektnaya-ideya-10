import Icon from "@/components/ui/icon";
import { useVerifiedIds } from "@/lib/users";

interface Props {
  userId?: number | null;
  size?: number;
  className?: string;
}

const VerifiedBadge = ({ userId, size = 14, className = "" }: Props) => {
  const { data } = useVerifiedIds();
  if (!userId || !data?.has(userId)) return null;
  return (
    <span
      title="Аккаунт подтверждён"
      aria-label="Аккаунт подтверждён"
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 bg-sky-500 text-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon name="Check" size={Math.round(size * 0.68)} strokeWidth={3.5} />
    </span>
  );
};

export default VerifiedBadge;
