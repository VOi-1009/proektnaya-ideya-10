import { useAuth } from "@/lib/auth";
import { tka, useWallet } from "@/lib/tka";
import TkaIcon from "@/components/crypto/TkaIcon";
import { GoFn } from "./homeConfig";

const TkaBadge = ({ go }: { go: GoFn }) => {
  const { user, token } = useAuth();
  const { data } = useWallet(user ? token : null);
  if (!user || !data) return null;
  return (
    <button
      onClick={() => go("trading")}
      title="Кошелёк TKA — внутренняя игровая монета, 1 TKA = 1 USDT"
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rail rounded-lg hover:bg-hover transition-colors flex-shrink-0"
    >
      <TkaIcon size={18} />
      <span className="font-mono text-sm text-white">{Math.round(data.total).toLocaleString("ru-RU")}</span>
      <span className="text-[10px] font-semibold text-primary">TKA</span>
    </button>
  );
};

export default TkaBadge;
