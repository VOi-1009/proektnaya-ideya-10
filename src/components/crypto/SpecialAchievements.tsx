import Icon from "@/components/ui/icon";
import { Achievement } from "./Achievements";

export const SPECIAL_META: Record<string, { title: string; desc: string; icon: string; color: string; unit: string }> = {
  critic: { title: "Голос рынка", desc: "Оцените 25 новостей", icon: "ThumbsUp", color: "from-orange-400 to-rose-500", unit: "оценок" },
  voter: { title: "Гражданин", desc: "Проголосуйте в 5 опросах", icon: "Vote", color: "from-sky-400 to-blue-600", unit: "опросов" },
  month: { title: "Старожил", desc: "Заходите на сайт 30 разных дней", icon: "CalendarHeart", color: "from-emerald-400 to-teal-600", unit: "дней" },
  marathon: { title: "Железная воля", desc: "30 дней подряд без пропусков", icon: "Zap", color: "from-yellow-300 to-orange-500", unit: "дней подряд" },
  investor: { title: "Диверсификатор", desc: "Соберите портфель из 10 активов", icon: "PieChart", color: "from-violet-400 to-fuchsia-600", unit: "активов" },
  legend: { title: "Легенда TRADERKA", desc: "100 дней на сайте", icon: "Trophy", color: "from-amber-300 via-yellow-400 to-amber-600", unit: "дней" },
  trade_first: { title: "Первая сделка", desc: "Откройте первую позицию на тренировочной бирже", icon: "Rocket", color: "from-green-300 to-emerald-600", unit: "сделок" },
  trade_liq: { title: "Первая ликвидация", desc: "Переживите ликвидацию позиции на тренировочной бирже", icon: "Flame", color: "from-rose-400 to-red-600", unit: "ликвидаций" },
  trade_streak: { title: "Серия из 5 плюсов", desc: "Закройте 5 прибыльных сделок подряд", icon: "TrendingUp", color: "from-lime-300 to-green-600", unit: "плюсов подряд" },
  trade_profit: { title: "Профит +50%", desc: "Закройте сделку с прибылью от 50% суммы", icon: "BadgePercent", color: "from-emerald-300 via-green-400 to-teal-600", unit: "% лучшей сделки" },
  watcher: { title: "Смотритель", desc: "1000 минут на сайте", icon: "Telescope", color: "from-cyan-300 to-blue-600", unit: "минут" },
};

interface Props {
  items: Achievement[];
  compact?: boolean;
}

const SpecialAchievements = ({ items, compact }: Props) => {
  const done = items.filter((a) => a.done).length;
  const list = items.filter((a) => SPECIAL_META[a.id]);

  if (compact)
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-semibold text-sm flex items-center gap-1.5">
            <Icon name="Sparkles" size={14} className="text-accent" /> Особые достижения
          </span>
          <span className="text-muted-foreground text-xs font-mono">
            {done} / {list.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {list.map((a) => {
            const m = SPECIAL_META[a.id];
            return (
              <div
                key={a.id}
                title={`${m.title} — ${m.desc}${a.done ? "" : ` (${a.progress} из ${a.goal})`}`}
                className={`rounded-lg p-2 flex flex-col items-center text-center border ${a.done ? "border-accent/30 bg-accent/5" : "border-border opacity-50"}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                    a.done ? `bg-gradient-to-br ${m.color} text-black shadow` : "bg-rail text-muted-foreground"
                  }`}
                >
                  <Icon name={a.done ? m.icon : "Lock"} size={a.done ? 18 : 14} fallback="Award" />
                </div>
                <span className={`text-[9px] leading-tight ${a.done ? "text-white" : "text-muted-foreground"}`}>{m.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    );

  return (
    <section className="bg-card border border-accent/30 rounded-xl p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between gap-3 mb-1 relative">
        <h2 className="font-display text-lg text-white flex items-center gap-2">
          <Icon name="Sparkles" size={18} className="text-accent" /> Особые достижения
        </h2>
        <span className="text-muted-foreground text-sm">
          получено <span className="text-white font-mono">{done}</span> из {list.length}
        </span>
      </div>
      <p className="text-muted-foreground text-xs mb-4 relative">
        За активность на сайте. Видны другим участникам в вашей карточке.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 relative">
        {list.map((a) => {
          const m = SPECIAL_META[a.id];
          const pct = Math.min(100, (a.progress / a.goal) * 100);
          return (
            <div
              key={a.id}
              className={`rounded-xl p-4 border flex flex-col items-center text-center ${
                a.done ? "border-accent/40 bg-accent/5" : "border-border"
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl rotate-3 flex items-center justify-center mb-3 relative ${
                  a.done ? `bg-gradient-to-br ${m.color} text-black shadow-lg` : "bg-rail text-muted-foreground"
                }`}
              >
                <Icon name={m.icon} size={26} className="-rotate-3" fallback="Award" />
                {!a.done && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center -rotate-3">
                    <Icon name="Lock" size={12} />
                  </span>
                )}
              </div>
              <div className={`font-semibold text-sm ${a.done ? "text-white" : "text-muted-foreground"}`}>{m.title}</div>
              <div className="text-muted-foreground text-xs mt-1 mb-3">{m.desc}</div>
              {a.done ? (
                <span className="mt-auto inline-flex items-center gap-1 text-accent text-xs font-semibold">
                  <Icon name="Check" size={14} /> Получено
                </span>
              ) : (
                <div className="mt-auto w-full">
                  <div className="h-1.5 bg-rail rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-muted-foreground text-[10px] font-mono mt-1">
                    {a.progress} из {a.goal} {m.unit}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SpecialAchievements;
