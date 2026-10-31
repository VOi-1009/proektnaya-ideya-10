import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import TkaIcon from "@/components/crypto/TkaIcon";

interface Props { setAuthOpen: (v: boolean) => void }

const GuestCard = ({ setAuthOpen }: Props) => (
  <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4 max-w-xl mx-auto">
    <TkaIcon size={44} className="mx-auto shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />
    <h2 className="font-display text-lg text-white">Тренировочная биржа</h2>
    <p className="text-sm text-muted-foreground">Торгуйте на игровую монету TKA (1 TKA = 1 USDT) по реальным курсам. Биржа доступна только зарегистрированным пользователям.</p>
    <ul className="text-left grid sm:grid-cols-2 gap-2">
      {[
        { icon: "Gift", color: "text-primary", title: "1000 TKA в подарок", text: "стартовый капитал сразу после регистрации" },
        { icon: "CalendarCheck", color: "text-[#22C55E]", title: "Ежедневный бонус", text: "заходите каждый день: от 10 до 50 TKA" },
        { icon: "Trophy", color: "text-accent", title: "Рейтинг трейдеров", text: "соревнуйтесь и копируйте сделки лучших" },
        { icon: "Users", color: "text-metric-sky", title: "Сообщество", text: "делитесь результатами и идеями с трейдерами" },
        { icon: "Award", color: "text-[#A78BFA]", title: "Достижения", text: "награды в TKA и очки для вашего статуса" },
        { icon: "TrendingUp", color: "text-down", title: "Плечо, шорт, стопы", text: "всё как на настоящей бирже, без риска" },
      ].map((b) => (
        <li key={b.title} className="flex items-start gap-2.5 rounded-lg border border-border bg-rail/40 px-3 py-2.5">
          <Icon name={b.icon} size={18} className={`${b.color} mt-0.5 flex-shrink-0`} />
          <div>
            <div className="text-sm font-semibold text-white leading-tight">{b.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{b.text}</div>
          </div>
        </li>
      ))}
    </ul>
    <Button onClick={() => setAuthOpen(true)} className="font-bold h-11 px-6">
      Зарегистрироваться и забрать 1000 TKA
    </Button>
    <button type="button" onClick={() => setAuthOpen(true)} className="block mx-auto text-xs text-muted-foreground hover:text-white underline">
      Уже есть аккаунт? Войти
    </button>
  </div>
);

export default GuestCard;
