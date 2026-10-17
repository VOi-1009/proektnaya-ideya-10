import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { AI_NAME, AiLog, AiPost, AiSettings, aiRequest } from "@/lib/aibot";
import BotBadge from "./BotBadge";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const ROOM: Record<string, string> = { green: "зелёные", red: "красные", premium: "премиум" };
const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

interface AdminData {
  settings: AiSettings;
  log: AiLog[];
  posts: AiPost[];
  stats: { blocked7d: number; reactions: number; posts: number };
}

const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-start gap-3 cursor-pointer">
    <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    <span>
      <span className="text-sm text-white block">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </span>
  </label>
);

const AiBotManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["ai-admin", token];
  const { data } = useQuery({ queryKey: key, queryFn: () => aiRequest<AdminData>(token, "&admin=1") });
  const [f, setF] = useState<AiSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !f) setF(data.settings);
  }, [data, f]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ai-admin"] });
    qc.invalidateQueries({ queryKey: ["ai-posts"] });
  };

  const run = async (body: object, ok: string) => {
    setBusy(true);
    try {
      await aiRequest(token, "", body);
      toast({ title: ok });
      refresh();
      return true;
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!f) return;
    setSaving(true);
    await run({ action: "settings", ...f }, "Настройки AiTraderKa сохранены");
    setSaving(false);
  };

  if (!f || !data) return <p className="text-muted-foreground text-sm">Загружаю…</p>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
          <Icon name="Sparkles" size={20} />
        </div>
        <div>
          <h1 className="font-display text-2xl text-white flex items-center gap-2">
            {AI_NAME} <BotBadge ai />
          </h1>
          <p className="text-muted-foreground text-sm">ИИ-бот сайта: модерация чатов, реакции на новости и канал «Новости от AiTraderKa».</p>
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-white">
          <Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
          {f.enabled ? "Бот работает" : "Бот выключен"}
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["ShieldBan", "Заблокировано за 7 дней", data.stats.blocked7d],
          ["ThumbsUp", "Оценок новостей", data.stats.reactions],
          ["Newspaper", "Публикаций", data.stats.posts],
        ].map(([icon, label, v]) => (
          <div key={String(label)} className="bg-card border border-border rounded-lg p-3">
            <div className="text-muted-foreground text-xs flex items-center gap-1.5">
              <Icon name={String(icon)} size={13} /> {label}
            </div>
            <div className="text-white font-mono text-xl mt-1">{Number(v).toLocaleString("ru-RU")}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Icon name="ShieldCheck" size={18} className="text-indigo-300" /> Модерация чатов
          </h2>
          <Toggle
            label="Проверять сообщения"
            hint="Мат, реклама и спам не публикуются — автор видит причину. Сообщения администраторов не проверяются."
            checked={f.moderation}
            onChange={(v) => setF({ ...f, moderation: v })}
          />
          <Toggle label="Запрещать ссылки" hint="Сайты, t.me, @боты" checked={f.blockLinks} onChange={(v) => setF({ ...f, blockLinks: v })} />
          <Toggle label="Запрещать капс" hint="Сообщения, написанные почти целиком заглавными" checked={f.blockCaps} onChange={(v) => setF({ ...f, blockCaps: v })} />
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Свои стоп-слова (через запятую или с новой строки)</span>
            <textarea
              className={`${inputCls} h-20 py-2 resize-y`}
              value={f.stopWords}
              onChange={(e) => setF({ ...f, stopWords: e.target.value })}
              placeholder="например: пирамида, скам-проект"
            />
          </label>
        </section>

        <section className="bg-card border border-border rounded-lg p-4 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Icon name="ThumbsUp" size={18} className="text-indigo-300" /> Лайки и дизлайки
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white">Как часто оценивает новости</span>
              <span className="font-mono text-indigo-200">{f.reactShare}%</span>
            </div>
            <Slider value={[f.reactShare]} min={0} max={100} step={5} onValueChange={([v]) => setF({ ...f, reactShare: v })} />
            <p className="text-xs text-muted-foreground">Обычные боты оценивают 45% новостей, AiTraderKa — чаще и быстрее (в первые 2 минуты).</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white">Доля лайков</span>
              <span className="font-mono text-indigo-200">
                👍 {f.likeShare}% · 👎 {100 - f.likeShare}%
              </span>
            </div>
            <Slider value={[f.likeShare]} min={0} max={100} step={5} onValueChange={([v]) => setF({ ...f, likeShare: v })} />
          </div>
          <h2 className="text-white font-semibold flex items-center gap-2 pt-2">
            <Icon name="Wand2" size={18} className="text-indigo-300" /> Автодайджест
          </h2>
          <Toggle
            label="Публиковать дайджест самых обсуждаемых новостей"
            checked={f.autoNews}
            onChange={(v) => setF({ ...f, autoNews: v })}
          />
          <label className="flex items-center gap-2 text-sm text-white">
            Не чаще раза в
            <input
              className={`${inputCls} w-20 text-center`}
              value={f.newsHours}
              inputMode="numeric"
              onChange={(e) => setF({ ...f, newsHours: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 1 })}
            />
            часов
          </label>
        </section>
      </div>

      <Button onClick={save} disabled={saving} className="font-semibold">
        {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
        Сохранить настройки
      </Button>

      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Icon name="PenLine" size={18} className="text-indigo-300" /> Публикация от имени {AI_NAME}
          </h2>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => run({ action: "digest" }, "Дайджест опубликован")}
            className="bg-transparent border-indigo-400/40 text-indigo-200 hover:bg-indigo-400/10 hover:text-indigo-100"
          >
            <Icon name="Wand2" size={14} className="mr-1.5" /> Собрать дайджест сейчас
          </Button>
        </div>
        <input className={inputCls} value={post.title} maxLength={200} onChange={(e) => setPost({ ...post, title: e.target.value })} placeholder="Заголовок" />
        <textarea
          className={`${inputCls} h-28 py-2 resize-y`}
          value={post.body}
          maxLength={5000}
          onChange={(e) => setPost({ ...post, body: e.target.value })}
          placeholder="Текст публикации"
        />
        <Button
          disabled={busy || post.title.trim().length < 2}
          onClick={async () => (await run({ action: "post", ...post }, "Опубликовано в канале")) && setPost({ title: "", body: "" })}
          className="font-semibold bg-indigo-500 hover:bg-indigo-400 text-white"
        >
          Опубликовать
        </Button>
        {data.posts.length > 0 && (
          <div className="space-y-1.5 pt-2">
            {data.posts.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-rail/60 rounded px-3 py-2 text-sm">
                <Icon name={p.kind === "auto" ? "Wand2" : "PenLine"} size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="text-white truncate flex-1">{p.title}</span>
                <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{fmt(p.createdAt)}</span>
                <button
                  onClick={() => window.confirm("Удалить публикацию?") && run({ action: "delete-post", id: p.id }, "Публикация удалена")}
                  className="text-muted-foreground hover:text-down"
                  title="Удалить"
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Icon name="ScrollText" size={18} className="text-indigo-300" /> Журнал модерации
          </h2>
          {data.log.length > 0 && (
            <button
              onClick={() => window.confirm("Очистить журнал?") && run({ action: "clear-log" }, "Журнал очищен")}
              className="text-xs text-muted-foreground hover:text-down"
            >
              Очистить
            </button>
          )}
        </div>
        {data.log.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Нарушений пока не было — в чатах порядок.</p>
        ) : (
          <div className="space-y-1.5">
            {data.log.map((l) => (
              <div key={l.id} className="bg-rail/60 rounded px-3 py-2">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-white font-medium">{l.user}</span>
                  <span className="text-muted-foreground">чат: {ROOM[l.room] ?? l.room}</span>
                  <span className="bg-rose-400/15 text-rose-200 rounded-full px-2 py-0.5 text-[10px]">{l.reason}</span>
                  <span className="ml-auto text-muted-foreground font-mono text-[10px]">{fmt(l.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 break-words line-clamp-2">{l.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AiBotManager;
