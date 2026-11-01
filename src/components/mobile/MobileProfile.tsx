import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PROFILE_URL, useAuth } from "@/lib/auth";
import { LEVELS } from "@/lib/status";
import { Achievement } from "@/components/crypto/Achievements";
import UserAvatar from "@/components/crypto/UserAvatar";
import VerifiedBadge from "@/components/crypto/VerifiedBadge";
import ShopBadge from "@/components/crypto/ShopBadge";
import TeamBadge from "@/components/crypto/TeamBadge";
import FounderBadge from "@/components/crypto/FounderBadge";
import SupporterBadge from "@/components/crypto/SupporterBadge";
import ProfileSummary from "@/components/crypto/ProfileSummary";
import ProfileRewards from "@/components/crypto/ProfileRewards";
import GamesStats from "@/components/crypto/GamesStats";
import FundBadges from "@/components/crypto/FundBadges";
import ContactLinks from "@/components/crypto/ContactLinks";

interface Data {
  id: number;
  email: string;
  name: string;
  avatar: string;
  bio: string;
  city: string;
  createdAt: string;
  headline?: string;
  stats: { days: number; streak?: number; bestStreak?: number };
  achievements?: Achievement[];
  special?: Achievement[];
  founder?: number | null;
  foundersTaken?: number;
  supporter?: number | null;
  creator?: boolean;
  promo?: string;
  team?: { team?: string };
  contacts?: Record<string, string>;
  status: { level: number; title: string; points: number; current: number; next: number | null; nextTitle: string | null };
}

const MobileProfile = ({ onClose, onWallet }: { onClose: () => void; onWallet: () => void }) => {
  const { token, ready, user, setAuthOpen, logout } = useAuth();
  const [p, setP] = useState<Data | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!ready || !token) return;
    fetch(PROFILE_URL, { headers: { "X-Auth-Token": token } })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Не удалось загрузить профиль");
        setP(d.profile as Data);
      })
      .catch((e) => setErr((e as Error).message));
  }, [ready, token]);

  const head = (
    <button onClick={onClose} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white">
      <Icon name="ChevronLeft" size={14} /> Назад
    </button>
  );

  if (ready && !user) {
    return (
      <div className="space-y-3">
        {head}
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <Icon name="UserRound" size={32} className="text-primary mx-auto" />
          <p className="text-sm text-white">Войдите, чтобы увидеть свой профиль</p>
          <Button onClick={() => setAuthOpen(true)} className="font-semibold">Войти</Button>
        </div>
      </div>
    );
  }

  if (err) return <div className="space-y-3">{head}<p className="text-sm text-down">{err}</p></div>;
  if (!p || !token) {
    return (
      <div className="space-y-3">
        {head}
        <Skeleton className="h-40 w-full bg-card" />
        <Skeleton className="h-28 w-full bg-card" />
      </div>
    );
  }

  const s = p.status;
  const lv = LEVELS[Math.min(Math.max(s.level - 1, 0), LEVELS.length - 1)];
  const progress = s.next ? ((s.points - s.current) / (s.next - s.current)) * 100 : 100;
  const since = new Date(p.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      {head}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={p.name} email={p.email} avatar={p.avatar} level={s.level} online dot="md" className="w-16 h-16 text-2xl" userId={p.id} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="font-display text-lg text-white truncate">{p.name || "Без имени"}</h2>
              <VerifiedBadge userId={p.id} size={16} />
              <ShopBadge userId={p.id} size={20} />
            </div>
            {p.headline && <div className="text-xs text-foreground truncate">{p.headline}</div>}
            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {p.city && <span className="inline-flex items-center gap-1"><Icon name="MapPin" size={11} />{p.city}</span>}
              <span className="inline-flex items-center gap-1"><Icon name="CalendarDays" size={11} />с {since}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${lv.cls}`}>
            <Icon name={lv.icon} size={13} /> {s.title}
          </span>
          <TeamBadge team={p.team?.team} />
          <SupporterBadge no={p.supporter} creator={p.creator} />
          <FounderBadge no={p.founder} />
        </div>
        <div className="rounded-lg bg-rail p-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Очки активности</span>
            <span className="font-mono text-white">{s.points}</span>
          </div>
          <Progress value={progress} className="h-2 bg-hover" />
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {s.next ? <>До статуса «{s.nextTitle}» — <span className="text-white font-mono">{s.next - s.points}</span></> : "Максимальный статус"}
          </div>
        </div>
        {p.bio && <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{p.bio}</p>}
        <ContactLinks contacts={p.contacts} />
      </section>

      <ProfileSummary token={token} streak={p.stats.streak ?? 0} bestStreak={p.stats.bestStreak ?? 0} days={p.stats.days} />
      <ProfileRewards level={s.level} achievements={p.achievements} special={p.special} founder={p.founder} foundersTaken={p.foundersTaken} promo={p.promo} streak={p.stats.streak ?? 0} />
      <GamesStats token={token} />
      <FundBadges token={token} />

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onWallet} className="rounded-xl border border-border bg-card py-3 text-sm text-white font-semibold flex items-center justify-center gap-1.5 active:bg-hover/40">
          <Icon name="Wallet" size={15} className="text-primary" /> Кошелёк
        </button>
        <a href="/profile" className="rounded-xl border border-border bg-card py-3 text-sm text-white font-semibold flex items-center justify-center gap-1.5 active:bg-hover/40">
          <Icon name="Settings" size={15} className="text-primary" /> Редактировать
        </a>
      </div>
      <button onClick={() => { logout(); onClose(); }} className="w-full text-center text-xs text-muted-foreground hover:text-white py-2">Выйти из аккаунта</button>
    </div>
  );
};

export default MobileProfile;
