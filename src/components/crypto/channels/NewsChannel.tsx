import { useState } from "react";
import Icon from "@/components/ui/icon";
import Message from "../Message";
import { NEWS, NEWS_TAGS, NewsTag, TAG_STYLE } from "../news";

const NewsChannel = () => {
  const [tag, setTag] = useState<NewsTag | "Все">("Все");
  const [reacted, setReacted] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<number | null>(null);

  const list = tag === "Все" ? NEWS : NEWS.filter((n) => n.tag === tag);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mt-2">
        {(["Все", ...NEWS_TAGS] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              tag === t
                ? "bg-white text-black border-white"
                : "border-input text-muted-foreground hover:text-white hover:border-white/40"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {list.map((n, idx) => (
        <Message
          key={n.id}
          author={n.author}
          time={n.time}
          avatar={n.avatar}
          avatarClass={n.avatarClass}
          bot={n.author.startsWith("Редакция")}
          delay={idx * 50}
        >
          <article className="bg-card border-l-4 border-primary rounded p-3 sm:p-4 max-w-2xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${TAG_STYLE[n.tag]}`}>
                {n.tag}
              </span>
              {n.hot && (
                <span className="text-[10px] uppercase tracking-wider bg-down/15 text-down rounded px-1.5 py-0.5 flex items-center gap-1">
                  <Icon name="Flame" size={10} /> Горячее
                </span>
              )}
              {n.coins.map((c) => (
                <span key={c} className="font-mono text-[11px] text-muted-foreground">
                  ${c}
                </span>
              ))}
            </div>
            <h3 className="text-white font-semibold text-base sm:text-lg leading-snug mb-1.5">{n.title}</h3>
            <p className={`text-muted-foreground text-sm ${open === n.id ? "" : "line-clamp-2"}`}>{n.text}</p>
            <button
              onClick={() => setOpen(open === n.id ? null : n.id)}
              className="text-primary text-xs mt-2 hover:underline"
            >
              {open === n.id ? "Свернуть" : "Читать полностью"}
            </button>
          </article>
          <div className="flex gap-1.5 mt-2">
            {n.reactions.map((r) => {
              const key = `${n.id}-${r.e}`;
              const on = reacted[key];
              return (
                <button
                  key={key}
                  onClick={() => setReacted({ ...reacted, [key]: !on })}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border transition-colors ${
                    on ? "bg-primary/15 border-primary text-white" : "bg-card border-transparent text-muted-foreground hover:border-input"
                  }`}
                >
                  <span>{r.e}</span>
                  <span className="font-mono tabular">{r.n + (on ? 1 : 0)}</span>
                </button>
              );
            })}
          </div>
        </Message>
      ))}
    </div>
  );
};

export default NewsChannel;
