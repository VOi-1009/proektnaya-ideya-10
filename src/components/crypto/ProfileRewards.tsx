import Icon from "@/components/ui/icon";
import { LEVELS } from "@/lib/status";
import { Achievement, META } from "./Achievements";
import SpecialAchievements from "./SpecialAchievements";
import RareAchievements from "./RareAchievements";
import ReferralCard from "./referral/ReferralCard";

interface Props {
  level: number;
  achievements?: Achievement[];
  special?: Achievement[];
  founder?: number | null;
  foundersTaken?: number;
  promo?: string;
  streak: number;
}


const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">{children}</section>
);

const ProfileRewards = ({ level, achievements, special, founder, foundersTaken, streak }: Props) => {
  const basicDone = (achievements ?? []).filter((a) => a.done).length;

  return (
    <div className="space-y-5">
      <ReferralCard donate />

      {achievements && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Icon name="Award" size={14} className="text-primary" /> Достижения
            </span>
            <span className="text-muted-foreground text-xs font-mono">
              {basicDone} / {achievements.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((a) => {
              const m = META[a.id];
              if (!m) return null;
              const prog = a.id === "streak7" ? streak : a.progress;
              return (
                <div
                  key={a.id}
                  title={`${m.title} — ${m.desc}${a.done ? "" : ` (${prog} из ${a.goal})`}`}
                  className={`rounded-lg p-2 flex flex-col items-center text-center border ${a.done ? "border-primary/40 bg-primary/5" : "border-border opacity-60"}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                      a.done ? `bg-gradient-to-br ${m.color} text-black shadow` : "bg-rail text-muted-foreground"
                    }`}
                  >
                    <Icon name={a.done ? m.icon : "Lock"} size={a.done ? 18 : 14} />
                  </div>
                  <span className={`text-[9px] leading-tight ${a.done ? "text-white" : "text-muted-foreground"}`}>{m.title}</span>
                  {!a.done && <span className="text-muted-foreground text-[9px] font-mono">{prog}/{a.goal}</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <RareAchievements founder={founder} taken={foundersTaken} compact />
      </Card>

      {special && (
        <Card>
          <SpecialAchievements items={special} compact />
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Icon name="Medal" size={15} className="text-primary" />
          <span className="text-white font-semibold text-sm">Статусы</span>
        </div>
        <div className="space-y-1.5">
          {LEVELS.map((l, i) => {
            const current = level === i + 1;
            const reached = l.need === null ? current : level > i;
            return (
              <div
                key={l.title}
                title={l.desc}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 border ${current ? "border-primary bg-primary/10" : "border-transparent"} ${reached ? "" : "opacity-50"}`}
              >
                <Icon name={reached ? l.icon : "Lock"} size={15} className={reached ? "text-primary" : "text-muted-foreground"} />
                <span className="text-white text-sm flex-1 truncate">{l.title}</span>
                <span className="text-muted-foreground text-[11px] font-mono">{l.need === null ? "админ" : `${l.need}`}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default ProfileRewards;
