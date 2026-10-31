import { GoFn } from "./homeConfig";
import LangSwitch from "@/components/crypto/LangSwitch";

interface Props {
  go: GoFn;
}

const HomeNav = ({ go }: Props) => {
  return (
  <nav className="bg-card sticky top-0 z-30 flex items-center justify-between">
    <div className="px-4 sm:px-6 py-3">
      <button onClick={() => go("welcome")} className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl sm:text-2xl leading-none">
          Т
        </div>
        <div className="text-left">
          <h1 className="font-display text-lg sm:text-xl text-white leading-none tracking-wide">TRADER<span className="text-primary">KA</span>.RU</h1>
          <p className="text-xs text-muted-foreground hidden sm:block mt-1">Котировки, графики и новости.</p>
        </div>
      </button>
    </div>
    <div className="px-4 sm:px-6 flex-shrink-0 text-muted-foreground">
      <LangSwitch />
    </div>
  </nav>
  );
};

export default HomeNav;