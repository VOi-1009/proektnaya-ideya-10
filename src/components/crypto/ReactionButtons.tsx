import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Reaction } from "@/lib/reactions";

interface Props {
  value?: Reaction;
  onReact: (v: 1 | -1) => Promise<void>;
}

const ReactionButtons = ({ value, onReact }: Props) => {
  const { user, setAuthOpen } = useAuth();
  const r = value ?? { likes: 0, dislikes: 0, mine: 0 };

  const click = (v: 1 | -1) => {
    if (!user) {
      toast({ title: "Оценивать новости могут только зарегистрированные пользователи" });
      setAuthOpen(true);
      return;
    }
    onReact(v).catch((e) => toast({ title: (e as Error).message, variant: "destructive" }));
  };

  const btn = (active: boolean, activeCls: string) =>
    `inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-mono tabular transition-colors ${
      active ? activeCls : "border-input text-muted-foreground hover:text-white hover:border-white/40"
    }`;

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => click(1)} className={btn(r.mine === 1, "bg-up/15 border-up text-up")} aria-label="Нравится" title="Нравится">
        <Icon name="ThumbsUp" size={13} />
        {r.likes > 0 && r.likes}
      </button>
      <button onClick={() => click(-1)} className={btn(r.mine === -1, "bg-down/15 border-down text-down")} aria-label="Не нравится" title="Не нравится">
        <Icon name="ThumbsDown" size={13} />
        {r.dislikes > 0 && r.dislikes}
      </button>
    </div>
  );
};

export default ReactionButtons;
