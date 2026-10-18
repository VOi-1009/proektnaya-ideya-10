import Icon from "@/components/ui/icon";
import { LEVELS } from "@/lib/status";
import { META } from "../Achievements";
import { SPECIAL_META } from "../SpecialAchievements";

const Section = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
  <section className="bg-card border border-border rounded-xl p-4 sm:p-5">
    <h2 className="font-display text-lg text-white flex items-center gap-2 mb-3">
      <Icon name={icon} size={18} className="text-primary" /> {title}
    </h2>
    {children}
  </section>
);

const RULES: [string, string, string][] = [
  ["Heart", "Уважайте друг друга", "Спорьте с аргументами, а не с людьми. Оскорбления, унижения и травля недопустимы."],
  ["ShieldBan", "Без спама и рекламы", "Не рассылайте ссылки, не предлагайте «гарантированный доход», не зовите в чужие чаты и каналы."],
  ["Scale", "Не давайте финансовых гарантий", "Любое мнение о рынке — это личное мнение. Не обещайте прибыль и не выдавайте прогнозы за факты."],
  ["Lock", "Берегите личные данные", "Не публикуйте пароли, ключи от кошельков, коды из писем и чужие контакты. Администрация их никогда не спрашивает."],
  ["Languages", "Пишите по делу и понятно", "Без капслока, флуда и бессмысленных повторов. Новичкам помогайте, а не высмеивайте."],
  ["Ban", "Запрещённый контент", "Не размещайте материалы, нарушающие закон, а также ненависть по любому признаку, угрозы и мошеннические схемы."],
];

const RulesChannel = () => (
  <div className="space-y-4 animate-fade-in">
    <section className="rounded-xl border border-primary/30 bg-primary/10 p-4 sm:p-5 flex gap-3">
      <Icon name="Info" size={22} className="text-primary flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <h2 className="text-white font-semibold text-base mb-1">TRADERKA.RU — информационно-развлекательный проект</h2>
        <p className="text-muted-foreground leading-relaxed">
          Мы собираем котировки, новости и обсуждения, чтобы вам было интересно следить за рынком и общаться с единомышленниками.
          Всё, что вы видите на сайте, включая сообщения участников, материалы редакции и заметки ИИ-бота AiTraderKa,
          носит информационный и развлекательный характер и <b className="text-white">не является инвестиционной рекомендацией</b>.
          Торговля криптовалютами и другими активами связана с высоким риском потери средств. Решения вы принимаете самостоятельно и на свою ответственность.
        </p>
      </div>
    </section>

    <Section icon="Medal" title="Статусы">
      <p className="text-muted-foreground text-sm mb-3">
        Статус растёт вместе с вашей активностью на сайте. Чем выше статус, тем больше возможностей, например доступ в чаты.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {LEVELS.map((l) => (
          <div key={l.title} className="flex items-start gap-3 bg-rail/60 rounded-lg p-3">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${l.cls}`}>
              <Icon name={l.icon} size={17} />
            </span>
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold">
                {l.title}
                <span className="text-muted-foreground font-mono text-[11px] font-normal ml-2">
                  {l.need === null ? "выдаёт администрация" : `от ${l.need} очков`}
                </span>
              </div>
              <div className="text-muted-foreground text-xs mt-0.5">{l.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <h3 className="text-white text-sm font-semibold mt-4 mb-2">Как набрать очки</h3>
      <ul className="text-muted-foreground text-sm space-y-1.5">
        <li className="flex gap-2"><Icon name="CalendarCheck" size={15} className="text-primary mt-0.5 flex-shrink-0" /> 10 очков за каждый день, когда вы заходите на сайт.</li>
        <li className="flex gap-2"><Icon name="Clock" size={15} className="text-primary mt-0.5 flex-shrink-0" /> 2 очка за каждые 10 минут, проведённые на сайте.</li>
        <li className="flex gap-2"><Icon name="Coins" size={15} className="text-primary mt-0.5 flex-shrink-0" /> 5 очков за каждую монету в портфеле (до 20 монет).</li>
        <li className="flex gap-2"><Icon name="UserRound" size={15} className="text-primary mt-0.5 flex-shrink-0" /> 6 очков за каждое заполненное поле профиля: имя, фото, о себе, город, любимая монета.</li>
        <li className="flex gap-2"><Icon name="Gift" size={15} className="text-primary mt-0.5 flex-shrink-0" /> Бонусные очки иногда дарит администрация.</li>
      </ul>
    </Section>

    <Section icon="Trophy" title="Достижения">
      <p className="text-muted-foreground text-sm mb-3">
        За особые действия на сайте вы получаете значки. Их видно в личном кабинете, а мини-иконки показываются в вашей карточке справа.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {[...Object.values(META), ...Object.values(SPECIAL_META)].map((m) => (
          <div key={m.title} className="flex items-start gap-3 bg-rail/60 rounded-lg p-3">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${m.color} text-black`}>
              <Icon name={m.icon} size={17} fallback="Award" />
            </span>
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold">{m.title}</div>
              <div className="text-muted-foreground text-xs mt-0.5">{m.desc}</div>
            </div>
          </div>
        ))}
        <div className="flex items-start gap-3 bg-rail/60 rounded-lg p-3">
          <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-black">
            <Icon name="Gem" size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-white text-sm font-semibold">Основатель</div>
            <div className="text-muted-foreground text-xs mt-0.5">Редкий значок для первых 100 участников.</div>
          </div>
        </div>
      </div>
    </Section>

    <Section icon="Handshake" title="Правила общения и поведения">
      <div className="grid sm:grid-cols-2 gap-2">
        {RULES.map(([icon, title, text]) => (
          <div key={title} className="flex items-start gap-3 bg-rail/60 rounded-lg p-3">
            <Icon name={icon} size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold">{title}</div>
              <div className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2 text-xs text-muted-foreground bg-rail/60 rounded-lg p-3">
        <Icon name="Sparkles" size={15} className="text-primary flex-shrink-0 mt-0.5" />
        <span>
          В чатах работает ИИ-модератор AiTraderKa: он может не пропустить сообщение, нарушающее правила, и объяснит причину.
          За повторные нарушения администрация вправе ограничить доступ к чатам и другим разделам.
        </span>
      </div>
    </Section>
  </div>
);

export default RulesChannel;