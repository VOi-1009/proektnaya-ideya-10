import Icon from "@/components/ui/icon";

interface Props {
  founder?: number | null;
  taken?: number;
  compact?: boolean;
}

const LIMIT = 100;

const RareAchievements = ({ founder, taken, compact }: Props) => {
  const done = !!founder;
  const left = taken !== undefined ? Math.max(0, LIMIT - taken) : null;

  if (compact)
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-semibold text-sm flex items-center gap-1.5">
            <Icon name="Gem" size={14} className="text-amber-300" /> Редкие достижения
          </span>
          <span className="text-muted-foreground text-xs font-mono">{done ? 1 : 0} / 1</span>
        </div>
        <div
          className={`rounded-lg p-2 flex items-center gap-3 border ${done ? "border-amber-300/40 bg-amber-300/5" : "border-border opacity-50"}`}
          title="Выдаётся только первым 100 участникам"
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              done ? "bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-black shadow" : "bg-rail text-muted-foreground"
            }`}
          >
            <Icon name={done ? "Gem" : "Lock"} size={done ? 18 : 14} />
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${done ? "text-amber-300" : "text-muted-foreground"}`}>
              Основатель{done && ` №${founder}`}
            </div>
            <div className="text-muted-foreground text-[11px]">Один из первых 100 участников</div>
          </div>
        </div>
      </div>
    );

  return (
    <section className="bg-card border border-amber-300/40 rounded-xl p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-amber-300/10 blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between gap-3 mb-1 relative">
        <h2 className="font-display text-lg text-white flex items-center gap-2">
          <Icon name="Gem" size={18} className="text-amber-300" /> Редкие достижения
        </h2>
        <span className="text-muted-foreground text-sm">
          получено <span className="text-white font-mono">{done ? 1 : 0}</span> из 1
        </span>
      </div>
      <p className="text-muted-foreground text-xs mb-4 relative">Выдаются ограниченным тиражом и остаются с вами навсегда.</p>
      <div
        className={`relative rounded-xl p-5 border flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left ${
          done ? "border-amber-300/50 bg-gradient-to-r from-amber-300/10 to-transparent" : "border-border"
        }`}
      >
        <div
          className={`w-20 h-20 rounded-2xl rotate-6 flex items-center justify-center flex-shrink-0 relative ${
            done ? "bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-black shadow-[0_0_30px_rgba(251,191,36,0.4)]" : "bg-rail text-muted-foreground"
          }`}
        >
          <Icon name="Gem" size={36} className="-rotate-6" />
          {!done && (
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center -rotate-6">
              <Icon name="Lock" size={13} />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-display text-xl ${done ? "text-amber-300" : "text-muted-foreground"}`}>
            Основатель{done && <span className="font-mono text-base ml-2">№{founder}</span>}
          </div>
          <div className="text-muted-foreground text-sm mt-1">
            Только для первых 100 зарегистрированных участников. Дарит особый статус «Основатель» рядом с вашим именем.
          </div>
          <div className="mt-3 text-xs">
            {done ? (
              <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                <Icon name="Check" size={14} /> Получено навсегда
              </span>
            ) : left !== null ? (
              <span className={left > 0 ? "text-white" : "text-down"}>
                {left > 0 ? `Осталось мест: ${left} из ${LIMIT}` : "Все 100 мест уже заняты"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RareAchievements;
