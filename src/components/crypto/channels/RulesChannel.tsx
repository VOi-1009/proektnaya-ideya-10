import Icon from "@/components/ui/icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LEVELS, TEAM_CHANGE_PRICE } from "@/lib/status";
import { useAuth } from "@/lib/auth";
import { fundFmt, useExchangeSettings, useFund, useGamesConfig } from "@/lib/fund";
import { useShopCatalog } from "@/lib/shop";
import { META } from "../Achievements";
import { SPECIAL_META } from "../SpecialAchievements";
import TkaIcon from "../TkaIcon";

const RULES: [string, string, string][] = [
  ["Heart", "Уважайте друг друга", "Спорьте с аргументами, а не с людьми. Оскорбления и травля недопустимы."],
  ["ShieldBan", "Без спама и рекламы", "Не зовите в чужие чаты и не обещайте «гарантированный доход»."],
  ["Scale", "Без финансовых гарантий", "Любое мнение о рынке личное. Не обещайте прибыль."],
  ["Lock", "Берегите личные данные", "Не публикуйте пароли, ключи кошельков, коды из писем и чужие контакты."],
  ["Languages", "Пишите по делу", "Без капслока и флуда. Новичкам помогайте, а не высмеивайте."],
  ["Ban", "Запрещённый контент", "Ничего противозаконного, угроз и ненависти по любому признаку."],
];

const DAILY = [10, 15, 20, 25, 30, 40, 50];

const Row = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <li className="flex gap-2">
    <Icon name={icon} size={14} className="text-primary mt-0.5 flex-shrink-0" />
    <span>{children}</span>
  </li>
);

const Sec = ({ value, icon, title, hint, children }: { value: string; icon: string; title: string; hint?: string; children: React.ReactNode }) => (
  <AccordionItem value={value} className="bg-card border border-border rounded-xl px-4 border-b">
    <AccordionTrigger className="py-3 hover:no-underline">
      <span className="flex items-center gap-2.5 text-left">
        <Icon name={icon} size={17} className="text-primary flex-shrink-0" />
        <span className="font-display text-base text-white">{title}</span>
        {hint && <span className="text-[11px] text-muted-foreground font-normal hidden sm:inline">{hint}</span>}
      </span>
    </AccordionTrigger>
    <AccordionContent className="text-sm text-muted-foreground pb-4">{children}</AccordionContent>
  </AccordionItem>
);

const Chip = ({ icon, cls, title, sub }: { icon: string; cls: string; title: string; sub?: string }) => (
  <div className="flex items-center gap-2 bg-rail/60 rounded-lg px-2.5 py-1.5 min-w-0">
    <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cls}`}>
      <Icon name={icon} size={14} fallback="Award" />
    </span>
    <div className="min-w-0 leading-tight">
      <div className="text-white text-xs font-semibold truncate">{title}</div>
      {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
    </div>
  </div>
);

const RulesChannel = () => {
  const { token } = useAuth();
  const { data: ex } = useExchangeSettings(token);
  const { data: fund } = useFund(token);
  const { data: games } = useGamesConfig(token);
  const { data: shop } = useShopCatalog(token);
  const titles = ex?.titles ?? LEVELS.map((l) => l.title);
  const tiers = ex?.levelRules ? ex.leverageTiers ?? [] : [];
  const locked = Object.entries(ex?.coinMinLevel ?? {});
  const gs = games?.settings;
  const enabledGames = games ? Object.entries(games.names).filter(([id]) => gs?.games[id]).map(([, n]) => n) : [];
  const prices = (shop?.items ?? []).filter((i) => i.kind !== "gift");
  const minP = prices.length ? Math.min(...prices.map((i) => i.price)) : null;
  const maxP = prices.length ? Math.max(...prices.map((i) => i.price)) : null;

  return (
    <div className="space-y-3 animate-fade-in max-w-4xl">
      <section className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex gap-3">
        <Icon name="Info" size={20} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <b className="text-white">TRADER<span className="text-primary">KA</span>.RU</b> — информационно-развлекательный проект. Всё на сайте, включая сообщения участников,
          материалы редакции и заметки ИИ-бота AiTKA, <b className="text-white">не является инвестиционной рекомендацией</b>. TKA — игровая монета без реальной стоимости,
          её нельзя вывести или обменять на деньги. Решения о реальных сделках вы принимаете сами и на свой риск.
        </p>
      </section>

      <Accordion type="multiple" defaultValue={["tka"]} className="space-y-2">
        <Sec value="tka" icon="Coins" title="Монета TKA" hint="как получить и на что потратить">
          <ul className="space-y-1.5">
            <Row icon="Gift">Новый участник получает на тренировочную биржу <b className="text-white">1000 TKA</b>.</Row>
            <Row icon="CalendarCheck">
              Ежедневный бонус за вход растёт с серией дней: {DAILY.map((v, i) => (i ? `, ${v}` : v))} TKA. Пропустили день — серия начинается заново.
            </Row>
            <Row icon="Trophy">TKA дают за победы в конкурсах, достижения и призы от администрации.</Row>
            <Row icon="Store">Тратить можно в магазине, на мини-играх и на тренировочной бирже.</Row>
            <Row icon="Landmark">Покупки в магазине выводят TKA из оборота, а проигрыши в играх и комиссии биржи идут в общий фонд.</Row>
          </ul>
        </Sec>

        <Sec value="levels" icon="Medal" title="Статусы" hint="растут с вашей активностью">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {LEVELS.map((l) => (
              <Chip key={l.title} icon={l.icon} cls={l.cls} title={l.title} sub={l.need === null ? "выдаёт администрация" : `от ${l.need} очков`} />
            ))}
          </div>
          <h3 className="text-white text-xs font-semibold mt-3 mb-1.5">Как набрать очки</h3>
          <ul className="space-y-1">
            <Row icon="CalendarCheck">10 очков за каждый день, когда вы заходите на сайт.</Row>
            <Row icon="Clock">2 очка за каждые 10 минут на сайте.</Row>
            <Row icon="Wallet">5 очков за каждую монету в портфеле (до 20 монет).</Row>
            <Row icon="UserRound">6 очков за каждое заполненное поле профиля: имя, фото, о себе, город, любимая монета.</Row>
            <Row icon="LineChart">Очки за достижения биржи и бонусы от администрации.</Row>
          </ul>
          <p className="mt-2 text-xs">Статус открывает чаты, а на бирже и в играх задаёт доступное плечо и монеты.</p>
        </Sec>

        <Sec value="exchange" icon="CandlestickChart" title="Тренировочная биржа" hint="плечо, монеты, комиссия">
          <ul className="space-y-1.5">
            <Row icon="Activity">Цены настоящие, деньги игровые. Можно открывать лонг и шорт, ставить стоп-лосс, тейк-профит и лимитные заявки.</Row>
            <Row icon="AlertTriangle">
              Плечо увеличивает и прибыль, и убыток. При плече x10 хватит движения цены примерно в 9,5% против вас, и позиция закроется автоматически.
            </Row>
            <Row icon="Percent">
              Комиссия {ex ? String(ex.feePercent).replace(".", ",") : "0,05"}% идёт в общий фонд. Минимальная ставка в сделке: {ex ? String(ex.minMargin).replace(".", ",") : "1"} TKA.
            </Row>
          </ul>
          {tiers.length > 0 && (
            <>
              <h3 className="text-white text-xs font-semibold mt-3 mb-1.5">Максимальное плечо по статусам</h3>
              <div className="flex flex-wrap gap-1.5">
                {tiers.map(([lv, lev]) => (
                  <span key={lv} className="rounded-full bg-rail/70 px-2.5 py-1 text-[11px]">
                    с «{titles[lv - 1]}» <b className="text-white font-mono">x{lev}</b>
                  </span>
                ))}
              </div>
            </>
          )}
          {locked.length > 0 && (
            <p className="mt-2 text-xs">
              Часть монет открывается по мере роста статуса:{" "}
              {locked.map(([c, lv], i) => (
                <span key={c}>
                  {i > 0 && ", "}
                  <span className="text-white">{c.replace("avalanche-2", "avalanche").replace("the-open-network", "ton").replace("hedera-hashgraph", "hedera")}</span> с «{titles[lv - 1]}»
                </span>
              ))}
              .
            </p>
          )}
        </Sec>

        <Sec value="fund" icon="Landmark" title="Общий фонд" hint="из чего складывается и куда идёт">
          <ul className="space-y-1.5">
            <Row icon="ArrowDownToLine">В фонд идёт комиссия с биржи, обменов и проигрыши в мини-играх. Любой участник может пополнить его добровольно.</Row>
            <Row icon="ArrowUpFromLine">Из фонда платятся выигрыши в играх, призы конкурсов и награды участникам.</Row>
            {fund && (
              <Row icon="PiggyBank">
                Сейчас в фонде <b className="text-white font-mono inline-flex items-center gap-1">{fundFmt(fund.total)} <TkaIcon size={13} /></b>
                {fund.goal > 0 && <> из цели {fundFmt(fund.goal)}</>}.
              </Row>
            )}
          </ul>
        </Sec>

        <Sec value="shop" icon="Store" title="Магазин" hint="украшения профиля и подарки">
          <ul className="space-y-1.5">
            <Row icon="Palette">Шапки постов, рамки аватара, шапки мини-карточки, темы сообщений и значки. Одновременно можно носить по одному предмету каждого вида.</Row>
            <Row icon="Gift">Любой товар можно подарить другому участнику, например кофе, кубок или золотую монету. Количество подарков в сутки ограничено.</Row>
            {minP !== null && maxP !== null && <Row icon="Tag">Украшения стоят от {fundFmt(minP)} до {fundFmt(maxP)} TKA. Купленное остаётся у вас навсегда.</Row>}
            <Row icon="Sparkles">Украшения видны всем: в постах, чатах, списках и в вашем профиле.</Row>
          </ul>
        </Sec>

        <Sec value="games" icon="Gamepad2" title="Мини-игры" hint="честные правила">
          <ul className="space-y-1.5">
            <Row icon="Dices">Сейчас доступны: {enabledGames.length ? enabledGames.join(", ") : "игры временно выключены"}.</Row>
            <Row icon="ShieldCheck">Результат считается на сервере случайным образом и не зависит от предыдущих игр. Выигрыши платятся из общего фонда.</Row>
            {gs && (
              <Row icon="SlidersHorizontal">
                Ставка от {fundFmt(gs.minBet)} до {fundFmt(gs.maxBet)} TKA{gs.dailyLimit ? `, не больше ${gs.dailyLimit} игр в сутки` : ""}. Преимущество фонда {String(gs.houseEdge).replace(".", ",")}%: в среднем игроку возвращается чуть меньше ставки.
              </Row>
            )}
            <Row icon="TrendingUp">
              «Бык или медведь»: ставите на рост или падение биткоина за {gs?.bbMinutes ?? 5} мин. Итог засчитывается сам, даже если вы закрыли сайт. Цена не изменилась, ставка возвращается.
            </Row>
          </ul>
          <p className="mt-2 text-xs">Играйте ради развлечения и тратьте только то, что не жалко.</p>
        </Sec>

        <Sec value="teams" icon="Swords" title="Команды и подтверждение" hint="быки, медведи, галочка">
          <ul className="space-y-1.5">
            <Row icon="Users">
              Можно вступить в команду <b className="text-[#22C55E]">Быков</b> (верят в рост) или <b className="text-[#EF4444]">Медведей</b> (ждут снижения). Выбор бесплатный, потом команду можно менять бесплатно раз в месяц, а раньше срока за {TEAM_CHANGE_PRICE} TKA.
            </Row>
            <Row icon="BadgeCheck">Голубая галочка рядом с именем означает, что администрация подтвердила аккаунт.</Row>
          </ul>
        </Sec>

        <Sec value="ach" icon="Trophy" title="Достижения" hint="значки в профиле">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[...Object.values(META), ...Object.values(SPECIAL_META)].map((m) => (
              <Chip key={m.title} icon={m.icon} cls={`bg-gradient-to-br ${m.color} text-black`} title={m.title} sub={m.desc} />
            ))}
            <Chip icon="Gem" cls="bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-black" title="Основатель" sub="Редкий значок для первых 100 участников" />
          </div>
        </Sec>

        <Sec value="rules" icon="Handshake" title="Правила общения">
          <div className="grid sm:grid-cols-2 gap-1.5">
            {RULES.map(([icon, title, text]) => (
              <div key={title} className="flex items-start gap-2.5 bg-rail/60 rounded-lg px-3 py-2">
                <Icon name={icon} size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <div className="min-w-0 leading-snug">
                  <div className="text-white text-xs font-semibold">{title}</div>
                  <div className="text-[11px] mt-0.5">{text}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs flex gap-2">
            <Icon name="Sparkles" size={14} className="text-primary flex-shrink-0 mt-0.5" />
            В чатах работает ИИ-модератор AiTKA: он может не пропустить сообщение с нарушением и объяснит причину. За повторные нарушения администрация вправе ограничить доступ.
          </p>
        </Sec>
      </Accordion>
    </div>
  );
};

export default RulesChannel;
