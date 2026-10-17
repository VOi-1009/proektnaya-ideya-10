import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Poll, pct, pollsRequest, usePolls } from "@/lib/polls";

const plural = (n: number) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "голос";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "голоса";
  return "голосов";
};

const PollCard = ({ poll }: { poll: Poll }) => {
  const { token, user, setAuthOpen } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<number | null>(null);
  const voted = poll.mine !== null;
  const leader = Math.max(...poll.options.map((o) => o.votes));

  const vote = async (optionId: number) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setBusy(optionId);
    try {
      const { poll: updated } = await pollsRequest<{ poll: Poll }>(token, "", { action: "vote", pollId: poll.id, optionId });
      qc.setQueryData<Poll[]>(["polls", token], (old) => old?.map((p) => (p.id === updated.id ? updated : p)));
      toast({ title: "Голос учтён", description: "Спасибо, что участвуете!" });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-rail rounded-lg p-3">
      <div className="text-white text-sm font-medium leading-snug mb-2.5">{poll.question}</div>
      <div className="space-y-1.5">
        {poll.options.map((o) => {
          const p = pct(o.votes, poll.total);
          const mine = poll.mine === o.id;
          return voted ? (
            <div key={o.id} className="relative rounded overflow-hidden bg-background/40">
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-700 ${mine ? "bg-primary/35" : o.votes === leader ? "bg-white/15" : "bg-white/[0.07]"}`}
                style={{ width: `${p}%` }}
              />
              <div className="relative flex items-center gap-1.5 px-2 py-1.5 text-xs">
                {mine && <Icon name="Check" size={12} className="text-primary flex-shrink-0" />}
                <span className={`flex-1 min-w-0 truncate ${mine ? "text-white font-medium" : "text-foreground"}`}>{o.text}</span>
                <span className="font-mono text-white tabular">{p}%</span>
              </div>
            </div>
          ) : (
            <button
              key={o.id}
              disabled={busy !== null}
              onClick={() => vote(o.id)}
              className="w-full text-left text-xs px-2.5 py-1.5 rounded border border-input text-foreground hover:border-primary hover:text-white hover:bg-primary/10 transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {busy === o.id ? (
                <Icon name="Loader2" size={12} className="animate-spin flex-shrink-0" />
              ) : (
                <span className="w-3 h-3 rounded-full border border-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate">{o.text}</span>
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-muted-foreground mt-2 font-mono">
        {poll.total.toLocaleString("ru-RU")} {plural(poll.total)}
        {!voted && !user && " · войдите, чтобы голосовать"}
      </div>
    </div>
  );
};

const SidePolls = () => {
  const { token } = useAuth();
  const { data } = usePolls(token);
  if (!data?.length) return null;
  return (
    <div>
      <h3 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
        <Icon name="Vote" size={12} fallback="BarChart3" /> Опрос
      </h3>
      <div className="space-y-2">
        {data.map((p) => (
          <PollCard key={p.id} poll={p} />
        ))}
      </div>
    </div>
  );
};

export default SidePolls;
