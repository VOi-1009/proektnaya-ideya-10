import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

const AdminHeader = () => (
  <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
    <Link to="/" className="flex items-center gap-3">
      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl sm:text-2xl leading-none">
        Т
      </div>
      <span className="font-display text-lg sm:text-xl text-white tracking-wide hidden sm:inline">
        TRADER<span className="text-primary">KA</span>.RU
      </span>
      <span className="text-xs uppercase tracking-wider bg-primary/15 text-primary rounded px-2 py-0.5">Админ</span>
    </Link>
    <Button variant="ghost" asChild className="text-muted-foreground hover:text-white hover:bg-hover">
      <Link to="/">
        <Icon name="ArrowLeft" size={16} className="mr-2" />
        На сайт
      </Link>
    </Button>
  </nav>
);

export default AdminHeader;
