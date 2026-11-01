import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";
import DonateButton from "./DonateButton";
import SupporterBadge from "./SupporterBadge";

interface Props {
  promo?: string;
  supporter?: number | null;
  creator?: boolean;
}

const PromoBlock = ({ promo, supporter, creator }: Props) => {
  if (!promo)
    return (
      <section className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-400/10 text-emerald-300 flex items-center justify-center flex-shrink-0">
          <Icon name="Ticket" size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg text-white">Личный промокод</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Войдите в аккаунт, и личный промокод появится сразу. А поддержав проект, вы получите значок «Поддержал проект» и доступ в Премиум-чат.
          </p>
        </div>
        <DonateButton />
      </section>
    );

  const copy = () => {
    navigator.clipboard.writeText(promo);
    toast({ title: "Промокод скопирован" });
  };

  return (
    <section className="relative overflow-hidden bg-card border border-emerald-400/30 rounded-xl p-5 sm:p-6">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-emerald-400/10 blur-2xl" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-lg text-white">Ваш личный промокод</h2>
            <SupporterBadge no={supporter} creator={creator} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {creator ? "Промокод создателя проекта." : "Спасибо, что поддержали проект!"} Промокод пригодится для будущих возможностей сайта, а ещё вам открыт Премиум-чат.
          </p>
        </div>
        <button
          onClick={copy}
          className="group flex items-center gap-3 rounded-lg border-2 border-dashed border-emerald-400/50 bg-emerald-400/10 px-5 py-3 hover:bg-emerald-400/20 transition-colors"
          title="Скопировать"
        >
          <span className="font-mono text-2xl font-bold tracking-widest text-emerald-200">{promo}</span>
          <Icon name="Copy" size={16} className="text-emerald-300/70 group-hover:text-emerald-200" />
        </button>
      </div>
    </section>
  );
};

export default PromoBlock;
