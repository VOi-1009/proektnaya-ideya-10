import Icon from "@/components/ui/icon";
import SidePolls from "../SidePolls";

const FEATURES: { id: string; icon: string; title: string; text: string; href: string; to?: string }[] = [
  { id: "market", icon: "LineChart", title: "Курсы и графики криптовалют", text: "Цены Bitcoin, Ethereum и других монет онлайн, свечные графики с индикаторами, сильнейшие и слабейшие за сутки и неделю.", href: "/?c=market" },
  { id: "news", icon: "Newspaper", title: "Новости крипторынка", text: "Свежие новости из нескольких источников и дайджесты ИИ-помощника AiTKA: что произошло и как это влияет на рынок.", href: "/?c=news" },
  { id: "community", icon: "MessagesSquare", title: "Соцсеть для трейдеров", text: "Публикуйте идеи, отмечайте монеты, выбирайте бычий или медвежий настрой, подписывайтесь на авторов и ставьте реакции.", href: "/community", to: "/community" },
  { id: "trading", icon: "CandlestickChart", title: "Тренировочная биржа", text: "Торгуйте на виртуальные USDT по реальным курсам: лонг и шорт, плечо, стоп-лосс и тейк-профит. Без риска потерять деньги.", href: "/?c=trading" },
  { id: "rating", icon: "Trophy", title: "Рейтинг, статусы и достижения", text: "Очки за активность, десятки статусов от новичка до эксперта, награды и таблица лучших участников сообщества.", href: "/rating", to: "/rating" },
  { id: "games", icon: "Gamepad2", title: "Мини-игры на TKA", text: "Бык или медведь, монетка, кости, колесо удачи и ракета. Играйте на игровую монету, а не на деньги.", href: "/?c=games" },
  { id: "portfolio", icon: "Wallet", title: "Портфель и уведомления", text: "Считайте стоимость своих монет, прибыль и убыток, ставьте оповещения о достижении нужной цены.", href: "/?c=portfolio" },
  { id: "converter", icon: "Calculator", title: "Калькуляторы трейдера", text: "Конвертер валют и монет, размер позиции, цена ликвидации, уровни Фибоначчи и пивоты в одном месте.", href: "/?c=converter" },
  { id: "shop", icon: "Store", title: "Магазин и общий фонд", text: "Тратьте TKA на рамки, значки, темы и подарки. Комиссии идут в общий фонд сообщества для конкурсов и призов.", href: "/?c=shop" },
];

const AboutTraderka = ({ go }: { go: (ch: string) => void }) => (
      <section aria-labelledby="about-traderka" className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col xl:flex-row gap-4 xl:gap-6 xl:items-start">
        <div className="flex-1 min-w-0">
          <h2 id="about-traderka" className="font-display text-base sm:text-lg text-white mb-2">
            Что умеет TRADER<span className="text-primary">KA</span>.RU — бесплатное крипто сообщество трейдеров
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            TRADERKA.RU объединяет курсы криптовалют онлайн, новости рынка, соцсеть для трейдеров и тренировочную биржу на виртуальные деньги. Читать, общаться и учиться торговать можно бесплатно: за активность вы получаете очки, статусы, достижения и игровую монету TKA.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FEATURES.map((f) => (
              <li key={f.id} className="rounded-lg bg-rail/50 border border-border/60 p-3">
                <a
                  href={f.href}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    f.to ? window.location.assign(f.to) : go(f.id);
                  }}
                  className="group block"
                >
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 group-hover:text-primary transition-colors">
                    <Icon name={f.icon} size={16} className="text-primary flex-shrink-0" />
                    {f.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{f.text}</p>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full xl:w-72 flex-shrink-0">
          <SidePolls />
        </div>
      </section>
);

export default AboutTraderka;
