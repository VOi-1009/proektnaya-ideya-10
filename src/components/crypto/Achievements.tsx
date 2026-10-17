import Icon from "@/components/ui/icon";

export interface Achievement {
  id: string;
  done: boolean;
  progress: number;
  goal: number;
}

const META: Record<string, { title: string; desc: string; icon: string; color: string }> = {
  streak7: { title: "Неделя в строю", desc: "Заходите на сайт 7 дней подряд", icon: "Flame", color: "from-orange-400 to-red-500" },
  firstCoin: { title: "Первая монета", desc: "Добавьте первую монету в портфель", icon: "Coins", color: "from-amber-300 to-yellow-500" },
  fullProfile: { title: "Всё о себе", desc: "Заполните все поля профиля и загрузите аватар", icon: "BadgeCheck", color: "from-sky-400 to-violet-500" },
};

interface Props {
  items: Achievement[];
  streak: number;
}

const Achievements = ({ items, streak }: Props) => {
  const done = items.filter((a) => a.done).length;
  return (
    <section className="bg-card border border-border rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-lg text-white">Достижения</h2>
        <span className="text-muted-foreground text-sm">
          получено <span className="text-white font-mono">{done}</span> из {items.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((a) => {
          const m = META[a.id];
          if (!m) return null;
          const pct = Math.min(100, (a.progress / a.goal) * 100);
          return (
            <div
              key={a.id}
              className={`rounded-xl p-4 border flex flex-col items-center text-center ${
                a.done ? "border-primary/40 bg-primary/5" : "border-border"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 relative ${
                  a.done ? `bg-gradient-to-br ${m.color} text-black shadow-lg` : "bg-rail text-muted-foreground"
                }`}
              >
                <Icon name={m.icon} size={30} />
                {!a.done && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center">
                    <Icon name="Lock" size={12} />
                  </span>
                )}
              </div>
              <div className={`font-semibold text-sm ${a.done ? "text-white" : "text-muted-foreground"}`}>{m.title}</div>
              <div className="text-muted-foreground text-xs mt-1 mb-3">{m.desc}</div>
              {a.done ? (
                <span className="mt-auto inline-flex items-center gap-1 text-up text-xs font-semibold">
                  <Icon name="Check" size={14} /> Получено
                </span>
              ) : (
                <div className="mt-auto w-full">
                  <div className="h-1.5 bg-rail rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-muted-foreground text-[10px] font-mono mt-1">
                    {a.id === "streak7" ? `${streak} из ${a.goal} дней подряд` : `${a.progress} из ${a.goal}`}
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

export default Achievements;
