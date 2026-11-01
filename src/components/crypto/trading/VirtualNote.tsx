import Icon from "@/components/ui/icon";

interface Props {
  variant?: "banner" | "inline";
  children?: React.ReactNode;
  className?: string;
}

const VirtualNote = ({ variant = "inline", children, className = "" }: Props) => {
  if (variant === "banner")
    return (
      <div className={`rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 flex items-start gap-2.5 ${className}`} role="note">
        <Icon name="Info" size={16} className="text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs leading-snug text-foreground/90">
          {children ?? (
            <>
              <span className="font-semibold text-white">USDT на бирже — виртуальные.</span> Это игровые деньги для тренировки: их нельзя вывести, купить или обменять на настоящие. TKA — внутренняя монета сайта, а не криптовалюта.
            </>
          )}
        </p>
      </div>
    );
  return (
    <p className={`flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground ${className}`} role="note">
      <Icon name="Info" size={11} className="text-primary mt-px flex-shrink-0" />
      <span>{children}</span>
    </p>
  );
};

export default VirtualNote;
