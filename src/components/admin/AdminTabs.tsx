import Icon from "@/components/ui/icon";

export type AdminTab =
  | "visits"
  | "articles"
  | "categories"
  | "users"
  | "blocks"
  | "side"
  | "polls"
  | "radars"
  | "sitenews"
  | "quotes"
  | "donate"
  | "aibot"
  | "push"
  | "referral"
  | "tournaments"
  | "listing"
  | "chats"
  | "forum"
  | "menu"
  | "fund"
  | "contests"
  | "exchange"
  | "shop"
  | "games"
  | "mobile"
  | "graphics";

interface SidebarProps {
  tab: AdminTab;
  setTab: (t: AdminTab) => void;
}

export const AdminSidebar = ({ tab, setTab }: SidebarProps) => (
  <div className="flex lg:flex-col gap-1 bg-card border border-border rounded-lg p-1 max-w-full overflow-x-auto lg:overflow-visible lg:w-56 lg:flex-shrink-0 lg:sticky lg:top-4">
    {(
      [
        ["visits", "Посетители", "Activity"],
        ["articles", "Статьи", "FileText"],
        ["blocks", "БЛОКИ", "LayoutPanelLeft"],
        ["users", "Пользователи", "Users"],
        ["polls", "Опросы", "ListChecks"],
        ["radars", "Радары", "Radar"],
        ["sitenews", "Новости сайта", "Megaphone"],
        ["quotes", "Цитаты из книг", "Quote"],
        ["donate", "Донаты", "Heart"],
        ["exchange", "БИРЖА", "CandlestickChart"],
        ["shop", "Магазин", "Store"],
        ["games", "Игры", "Gamepad2"],
        ["mobile", "Моб. версия", "Smartphone"],
        ["graphics", "Графика", "Image"],
        ["fund", "Фонд", "Landmark"],
        ["contests", "Конкурсы", "Trophy"],
        ["chats", "Чаты", "MessageCircle"],
        ["forum", "Форум", "MessagesSquare"],
        ["aibot", "AiTKA", "Sparkles"],
        ["push", "Пуш-уведомления", "BellRing"],
        ["referral", "Приведи друга", "UserPlus"],
        ["tournaments", "Турниры", "Swords"],
        ["listing", "Листинг", "Rocket"],
      ] as const
    ).map(([id, label, icon]) => (
      <button
        key={id}
        onClick={() => setTab(id)}
        className={`px-4 py-2 rounded-md text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap lg:w-full ${
          (tab === id || (id === "articles" && tab === "categories") || (id === "blocks" && (tab === "side" || tab === "menu"))) ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-white"
        }`}
      >
        <Icon name={icon} size={16} />
        {label}
      </button>
    ))}
  </div>
);

interface SwitcherProps {
  items: readonly (readonly [string, string, string])[];
  tab: AdminTab;
  setTab: (t: AdminTab) => void;
  wrap?: boolean;
}

export const TabSwitcher = ({ items, tab, setTab, wrap }: SwitcherProps) => (
  <div className={`inline-flex ${wrap ? "flex-wrap " : ""}gap-1 bg-card border border-border rounded-lg p-1`}>
    {items.map(([id, label, icon]) => (
      <button
        key={id}
        onClick={() => setTab(id as AdminTab)}
        className={`px-3 py-1.5 rounded-md text-sm inline-flex items-center gap-2 transition-colors ${tab === id ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-white"}`}
      >
        <Icon name={icon} size={14} />
        {label}
      </button>
    ))}
  </div>
);
