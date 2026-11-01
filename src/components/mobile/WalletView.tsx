import { useAuth } from "@/lib/auth";
import TkaWalletCard from "@/components/crypto/TkaWalletCard";
import TkaDailyCalendar from "@/components/crypto/TkaDailyCalendar";
import TradingStats from "@/components/crypto/TradingStats";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

const WalletView = () => {
  const { token, user, ready, setAuthOpen } = useAuth();
  if (ready && !user) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <Icon name="Wallet" size={32} className="text-primary mx-auto" />
        <p className="text-sm text-white">Войдите, чтобы увидеть кошелёк TKA и данные биржи</p>
        <Button onClick={() => setAuthOpen(true)} className="font-semibold">Войти</Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <TkaWalletCard token={token} />
      <TkaDailyCalendar token={token} />
      <TradingStats token={token} />
    </div>
  );
};

export default WalletView;
