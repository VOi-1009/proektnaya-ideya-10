import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { COIN_META } from "@/lib/crypto";
import { useEmojiList } from "@/lib/graphics";
import { MOODS, CommunityPost, communityRequest } from "@/lib/community";

interface Props {
  token: string | null;
  onPosted: (p: CommunityPost) => void;
}

const Composer = ({ token, onPosted }: Props) => {
  const emojiList = useEmojiList();
  const [text, setText] = useState("");
  const [mood, setMood] = useState<"" | "bull" | "bear">("");
  const [coins, setCoins] = useState<string[]>([]);
  const [image, setImage] = useState<{ data: string; type: string } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [coinOpen, setCoinOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const addEmoji = (e: string) => {
    const el = areaRef.current;
    const pos = el?.selectionStart ?? text.length;
    setText((t) => (t.slice(0, pos) + e + t.slice(pos)).slice(0, 2000));
    setEmojiOpen(false);
    el?.focus();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return toast({ title: "Подойдёт JPG, PNG или WEBP", variant: "destructive" });
    if (f.size > 3 * 1024 * 1024) return toast({ title: "Картинка должна быть до 3 МБ", variant: "destructive" });
    const rd = new FileReader();
    rd.onload = () => setImage({ data: String(rd.result), type: f.type });
    rd.readAsDataURL(f);
  };

  const toggleCoin = (id: string) => setCoins((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 5 ? [...c, id] : c));

  const send = async () => {
    if (!text.trim() && !image) return;
    setBusy(true);
    try {
      const d = await communityRequest<{ post: CommunityPost }>(token, "", {
        action: "post", body: text, sentiment: mood, coins, image: image?.data, contentType: image?.type,
      });
      onPosted(d.post);
      setText("");
      setMood("");
      setCoins([]);
      setImage(null);
    } catch (e) {
      toast({ title: "Не опубликовано", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const chip = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition-colors";

  return (
    <div className="border-b border-border pb-4 mb-2">
      <textarea
        ref={areaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        placeholder="Что думаете о рынке?"
        className="w-full bg-transparent text-white placeholder:text-muted-foreground outline-none resize-none min-h-[84px] text-[15px]"
      />
      {image && (
        <div className="relative inline-block mb-3">
          <img src={image.data} alt="" className="max-h-48 rounded-lg border border-border" />
          <button onClick={() => setImage(null)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center" aria-label="Убрать картинку">
            <Icon name="X" size={12} />
          </button>
        </div>
      )}
      {coins.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {coins.map((c) => (
            <button key={c} onClick={() => toggleCoin(c)} className={`${chip} border-border text-white hover:border-down`}>
              ${COIN_META[c]?.short ?? c} <Icon name="X" size={10} />
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button onClick={() => { setEmojiOpen(!emojiOpen); setCoinOpen(false); }} className="w-9 h-9 rounded-full hover:bg-hover text-muted-foreground hover:text-white flex items-center justify-center" aria-label="Эмодзи">
            <Icon name="Smile" size={18} />
          </button>
          {emojiOpen && (
            <div className="absolute z-20 top-10 left-0 bg-card border border-border rounded-xl p-2 grid grid-cols-8 gap-1 shadow-xl w-72">
              {emojiList.map((e) => (
                <button key={e} onClick={() => addEmoji(e)} className="text-xl hover:bg-hover rounded p-1">{e}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-full hover:bg-hover text-muted-foreground hover:text-white flex items-center justify-center" aria-label="Картинка">
          <Icon name="Image" size={18} />
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
        <div className="relative">
          <button onClick={() => { setCoinOpen(!coinOpen); setEmojiOpen(false); }} className={`${chip} border-border text-muted-foreground hover:text-white`}>
            <Icon name="CircleDollarSign" size={14} /> Монета
          </button>
          {coinOpen && (
            <div className="absolute z-20 top-9 left-0 bg-card border border-border rounded-xl p-2 shadow-xl w-64 max-h-64 overflow-y-auto">
              {Object.entries(COIN_META).map(([id, m]) => (
                <button key={id} onClick={() => toggleCoin(id)} className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-hover ${coins.includes(id) ? "text-white" : "text-muted-foreground"}`}>
                  <span>{m.ru}</span>
                  <span className="font-mono text-xs">{coins.includes(id) ? "✓" : m.short}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {(["bull", "bear"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setMood(mood === k ? "" : k)}
            className={`${chip} ${mood === k ? `${MOODS[k].cls} border-transparent font-semibold` : "border-border text-muted-foreground hover:text-white"}`}
          >
            <Icon name={MOODS[k].icon} size={13} /> {MOODS[k].label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground font-mono">{text.length}/2000</span>
        <Button onClick={send} disabled={busy || (!text.trim() && !image)} className="rounded-full font-semibold px-5">
          {busy && <Icon name="Loader2" size={14} className="mr-2 animate-spin" />}
          Опубликовать
        </Button>
      </div>
    </div>
  );
};

export default Composer;
