import { GoFn } from "./homeConfig";

interface Props {
  go: GoFn;
}

const HomeNav = ({ go }: Props) => (
  <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30">
    <button onClick={() => go("welcome")} className="flex items-center gap-3">
      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl sm:text-2xl leading-none">
        Т
      </div>
      <div className="text-left">
        <h1 className="font-display text-lg sm:text-xl text-white leading-none tracking-wide">TRADERKA<span className="text-primary">.RU</span></h1>
        <p className="text-xs text-muted-foreground hidden sm:block mt-1">Котировки, графики и новости.</p>
      </div>
    </button>
  </nav>
);

export default HomeNav;
