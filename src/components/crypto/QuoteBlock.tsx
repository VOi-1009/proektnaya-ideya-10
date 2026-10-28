import { useEffect, useState } from "react";
import { useQuotes } from "@/lib/quotes";

const QuoteBlock = () => {
  const { data } = useQuotes();
  const [idx, setIdx] = useState(0);
  const count = data?.length ?? 0;

  useEffect(() => {
    if (count < 2) return;
    setIdx(Math.floor(Math.random() * count));
    const t = setInterval(() => setIdx((i) => (i + 1) % count), 60_000);
    return () => clearInterval(t);
  }, [count]);

  const q = count ? data![idx % count] : null;
  if (!q) return null;
  const source = [q.author, q.book].filter(Boolean).join(" — ");

  return (
    <div className="flex-1 min-h-[60px] flex items-center gap-3 px-3 sm:px-4 py-2">
      <div key={q.id} className="flex-1 min-w-0 text-left animate-fade-in">
        <p className="font-display text-white text-sm not-italic leading-snug line-clamp-3">{q.quote}</p>
        {source && <div className="text-muted-foreground text-[10px] mt-1 truncate">{source}</div>}
      </div>
    </div>
  );
};

export default QuoteBlock;