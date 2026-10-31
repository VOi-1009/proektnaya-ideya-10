import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { TEAMS, TEAM_CHANGE_PRICE, Team } from "@/lib/status";
import TeamPicker from "./TeamPicker";

export interface TeamInfo {
  team: Team | "";
  daysLeft: number;
  free: boolean;
  price: number;
  wallet: number;
}

interface Props {
  info: TeamInfo;
  onChange: (team: Team, pay: boolean) => Promise<void>;
}

const TeamCard = ({ info, onChange }: Props) => {
  const [pick, setPick] = useState<Team | "">("");
  const [busy, setBusy] = useState(false);
  const target = pick && pick !== info.team ? pick : "";
  const canPay = info.wallet >= TEAM_CHANGE_PRICE;

  const run = async (pay: boolean) => {
    if (!target) return;
    setBusy(true);
    try {
      await onChange(target, pay);
      setPick("");
      toast({ title: `Вы в команде «${TEAMS[target].title}»` });
    } catch (e) {
      toast({ title: "Команда не изменилась", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-white font-semibold">Моя команда</span>
        {info.team && <span className="text-xs text-muted-foreground">{TEAMS[info.team].title}</span>}
      </div>
      <p className="text-muted-foreground text-xs mb-3">
        {!info.team
          ? "Выберите сторону рынка. Это бесплатно."
          : info.free
            ? "Сейчас команду можно сменить бесплатно."
            : `Бесплатная смена через ${info.daysLeft} дн. Раньше — за ${TEAM_CHANGE_PRICE} ТКА.`}
      </p>
      <TeamPicker value={pick || info.team} onChange={setPick} disabled={busy} />
      {target && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!info.team || info.free ? (
            <Button size="sm" disabled={busy} onClick={() => run(false)}>Перейти в «{TEAMS[target].title}»</Button>
          ) : (
            <>
              <Button size="sm" disabled={busy || !canPay} onClick={() => run(true)}>
                Сменить за {TEAM_CHANGE_PRICE} ТКА
              </Button>
              {!canPay && <span className="text-xs text-down">Не хватает свободных ТКА: есть {Math.floor(info.wallet)}</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamCard;
