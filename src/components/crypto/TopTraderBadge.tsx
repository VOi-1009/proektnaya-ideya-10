import Icon from "@/components/ui/icon";
import { useTopTraders } from "@/lib/fund";

const PLACE = [
  { title: "1 место в рейтинге трейдеров биржи", cls: "from-amber-300 via-yellow-400 to-amber-500" },
  { title: "2 место в рейтинге трейдеров биржи", cls: "from-slate-200 to-slate-400" },
  { title: "3 место в рейтинге трейдеров биржи", cls: "from-orange-300 to-orange-600" },
];

interface Props {
  userId?: number | null;
  size?: number;
  className?: string;
}

const TopTraderBadge = ({ userId, size = 16, className = "" }: Props) => {
  const { data } = useTopTraders();
  const idx = userId && data ? data.indexOf(userId) : -1;
  if (idx < 0) return null;
  const p = PLACE[idx];
  return (
    <span
      title={`${p.title} (виртуальные USDT)`}
      aria-label={p.title}
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 bg-gradient-to-br ${p.cls} text-black ring-1 ring-white/30 ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon name="Medal" size={Math.round(size * 0.62)} />
    </span>
  );
};

export default TopTraderBadge;
