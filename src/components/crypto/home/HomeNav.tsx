import ProfileMiniCard from "./ProfileMiniCard";
import TkaBadge from "./TkaBadge";
import { GoFn } from "./homeConfig";

interface Props {
  go: GoFn;
}

const HomeNav = ({ go }: Props) => (
  <nav className="bg-card sticky top-0 z-30 grid grid-cols-2">
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
    <div className="border-l border-transparent px-4 sm:px-6 py-3 flex items-center justify-end min-w-0">
      <div className="flex items-center gap-4 min-w-0">
        <TkaBadge go={go} />
        <ProfileMiniCard />
      </div>
    </div>
  </nav>
);

export default HomeNav;