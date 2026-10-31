import Icon from "@/components/ui/icon";
import { TEAMS, Team } from "@/lib/status";

interface Props {
  value: Team | "";
  onChange: (t: Team) => void;
  disabled?: boolean;
}

const TeamPicker = ({ value, onChange, disabled }: Props) => (
  <div className="grid grid-cols-2 gap-2">
    {(Object.keys(TEAMS) as Team[]).map((k) => {
      const t = TEAMS[k];
      const active = value === k;
      return (
        <button
          key={k}
          type="button"
          disabled={disabled}
          onClick={() => onChange(k)}
          className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${active ? "bg-hover" : "border-border hover:bg-hover/60"}`}
          style={active ? { borderColor: t.color } : undefined}
        >
          <span className={`w-8 h-8 rounded-full flex items-center justify-center ${t.cls}`}>
            <Icon name={t.icon} size={16} />
          </span>
          <div className="text-white text-sm font-semibold mt-2">{t.title}</div>
          <div className="text-muted-foreground text-xs">{t.desc}</div>
        </button>
      );
    })}
  </div>
);

export default TeamPicker;
