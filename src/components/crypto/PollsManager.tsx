import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { AdminPoll, pct, pollsRequest } from "@/lib/polls";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

type OptionForm = { id?: number; text: string; seed: string; real?: number };
type PollForm = { id?: number; question: string; active: boolean; botsVote: boolean; options: OptionForm[] };

const EMPTY: PollForm = {
  question: "",
  active: true,
  botsVote: true,
  options: [
    { text: "", seed: "0" },
    { text: "", seed: "0" },
  ],
};

const PollEditor = ({
  form,
  setForm,
  saving,
  onSave,
  onCancel,
}: {
  form: PollForm;
  setForm: (f: PollForm) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const seedTotal = form.options.reduce((s, o) => s + (parseInt(o.seed, 10) || 0), 0);
  const setOpt = (i: number, patch: Partial<OptionForm>) =>
    setForm({ ...form, options: form.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  return (
    <div className="bg-card border border-primary/50 rounded-lg p-4 space-y-4 animate-fade-in">
      <div className="text-white font-semibold flex items-center gap-2">
        <Icon name="ListChecks" size={18} className="text-primary" />
        {form.id ? "Редактирование опроса" : "Новый опрос"}
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Вопрос</span>
        <input
          className={inputCls}
          value={form.question}
          maxLength={300}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
          placeholder="Например: Куда пойдёт биткоин до конца месяца?"
          autoFocus
        />
      </label>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_110px_36px] gap-2 text-xs text-muted-foreground">
          <span>Варианты ответа</span>
          <span title="Сколько голосов показать сразу, до реальных ответов">Готовые голоса</span>
          <span />
        </div>
        {form.options.map((o, i) => {
          const seed = parseInt(o.seed, 10) || 0;
          return (
            <div key={i} className="grid grid-cols-[1fr_110px_36px] gap-2 items-center">
              <input
                className={inputCls}
                value={o.text}
                maxLength={150}
                onChange={(e) => setOpt(i, { text: e.target.value })}
                placeholder={`Вариант ${i + 1}`}
              />
              <div className="relative">
                <input
                  className={`${inputCls} pr-10 font-mono`}
                  value={o.seed}
                  inputMode="numeric"
                  onChange={(e) => setOpt(i, { seed: e.target.value.replace(/\D/g, "").slice(0, 7) })}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                  {pct(seed, seedTotal)}%
                </span>
              </div>
              <button
                disabled={form.options.length <= 2}
                onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })}
                className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-down hover:bg-down/10 disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Убрать вариант"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
          );
        })}
        {form.options.length < 8 && (
          <button
            onClick={() => setForm({ ...form, options: [...form.options, { text: "", seed: "0" }] })}
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <Icon name="Plus" size={14} /> Добавить вариант
          </button>
        )}
        <p className="text-[11px] text-muted-foreground">
          «Готовые голоса» видны посетителям сразу. Реальные голоса людей и ботов прибавляются к ним.
          {form.id && " Если удалить вариант, его реальные голоса тоже пропадут."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          Показывать на сайте
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Switch checked={form.botsVote} onCheckedChange={(v) => setForm({ ...form, botsVote: v })} />
          Боты голосуют
        </label>
      </div>
      {form.botsVote && (
        <p className="text-[11px] text-muted-foreground -mt-2">
          Боты голосуют постепенно в течение 6 часов, примерно в той же пропорции, что и готовые голоса.
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving} className="font-semibold">
          {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
          {form.id ? "Сохранить" : "Опубликовать"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="bg-transparent border-input hover:bg-hover hover:text-white">
          Отмена
        </Button>
      </div>
    </div>
  );
};

const PollsManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["admin-polls", token];
  const [form, setForm] = useState<PollForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => pollsRequest<{ polls: AdminPoll[] }>(token, "&admin=1").then((d) => d.polls),
  });

  const refreshPublic = () => qc.invalidateQueries({ queryKey: ["polls"] });

  const save = async () => {
    if (!form) return;
    const options = form.options
      .map((o) => ({ id: o.id, text: o.text.trim(), seed: parseInt(o.seed, 10) || 0 }))
      .filter((o) => o.text);
    if (form.question.trim().length < 3) return toast({ title: "Напишите вопрос", variant: "destructive" });
    if (options.length < 2) return toast({ title: "Нужно минимум 2 заполненных варианта", variant: "destructive" });
    setSaving(true);
    try {
      const { poll } = await pollsRequest<{ poll: AdminPoll }>(token, "", {
        action: form.id ? "update" : "create",
        id: form.id,
        question: form.question.trim(),
        active: form.active,
        botsVote: form.botsVote,
        options,
      });
      qc.setQueryData<AdminPoll[]>(key, (old) =>
        form.id ? old?.map((p) => (p.id === poll.id ? poll : p)) : [poll, ...(old ?? [])],
      );
      refreshPublic();
      toast({ title: form.id ? "Опрос сохранён" : "Опрос опубликован" });
      setForm(null);
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const act = async (p: AdminPoll, action: "toggle" | "delete") => {
    if (action === "delete" && !window.confirm(`Удалить опрос «${p.question}» вместе со всеми голосами?`)) return;
    setBusyId(p.id);
    try {
      if (action === "delete") {
        await pollsRequest(token, "", { action, id: p.id });
        qc.setQueryData<AdminPoll[]>(key, (old) => old?.filter((x) => x.id !== p.id));
        toast({ title: "Опрос удалён" });
      } else {
        const { poll } = await pollsRequest<{ poll: AdminPoll }>(token, "", { action, id: p.id });
        qc.setQueryData<AdminPoll[]>(key, (old) => old?.map((x) => (x.id === poll.id ? poll : x)));
        toast({ title: poll.active ? "Опрос снова на сайте" : "Опрос скрыт с сайта" });
      }
      refreshPublic();
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const edit = (p: AdminPoll) =>
    setForm({
      id: p.id,
      question: p.question,
      active: p.active,
      botsVote: p.botsVote,
      options: p.options.map((o) => ({ id: o.id, text: o.text, seed: String(o.seed), real: o.real })),
    });

  const activeCount = (data ?? []).filter((p) => p.active).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white">Опросы</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Показываются внизу правой панели. На сайте видны три последних включённых опроса
            {activeCount > 3 && <span className="text-accent"> — сейчас включено {activeCount}, лишние не видны</span>}.
          </p>
        </div>
        {!form && (
          <Button onClick={() => setForm({ ...EMPTY, options: EMPTY.options.map((o) => ({ ...o })) })} className="font-semibold">
            <Icon name="Plus" size={16} className="mr-1.5" />
            Новый опрос
          </Button>
        )}
      </div>

      {form && <PollEditor form={form} setForm={setForm} saving={saving} onSave={save} onCancel={() => setForm(null)} />}

      {isLoading && <Skeleton className="h-40 w-full bg-card" />}
      {isError && <div className="text-down text-sm">Не удалось загрузить опросы.</div>}

      <div className="space-y-3">
        {(data ?? []).map((p) => {
          const real = p.options.reduce((s, o) => s + o.real, 0);
          return (
            <div key={p.id} className={`bg-card border border-border rounded-lg p-4 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${p.active ? "bg-up/15 text-up" : "bg-white/10 text-muted-foreground"}`}>
                      {p.active ? "на сайте" : "скрыт"}
                    </span>
                    {p.botsVote && (
                      <span className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 bg-white/10 text-muted-foreground inline-flex items-center gap-1">
                        <Icon name="Bot" size={10} /> боты голосуют
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                    </span>
                  </div>
                  <div className="text-white font-medium mt-1.5">{p.question}</div>
                </div>
                <div className="flex items-center gap-1">
                  {busyId === p.id && <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground mr-1" />}
                  <button onClick={() => edit(p)} className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-hover" title="Изменить">
                    <Icon name="Pencil" size={16} />
                  </button>
                  <button
                    onClick={() => act(p, "toggle")}
                    disabled={busyId === p.id}
                    className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-hover"
                    title={p.active ? "Скрыть с сайта" : "Показать на сайте"}
                  >
                    <Icon name={p.active ? "EyeOff" : "Eye"} size={16} />
                  </button>
                  <button
                    onClick={() => act(p, "delete")}
                    disabled={busyId === p.id}
                    className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-down hover:bg-down/10"
                    title="Удалить"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {p.options.map((o) => {
                  const v = pct(o.votes, p.total);
                  return (
                    <div key={o.id} className="relative rounded overflow-hidden bg-rail">
                      <div className="absolute inset-y-0 left-0 bg-primary/25" style={{ width: `${v}%` }} />
                      <div className="relative flex items-center gap-2 px-3 py-1.5 text-sm">
                        <span className="flex-1 min-w-0 truncate text-foreground">{o.text}</span>
                        <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                          {o.seed.toLocaleString("ru-RU")} готовых + {o.real.toLocaleString("ru-RU")} реальных
                        </span>
                        <span className="font-mono text-white tabular w-10 text-right">{v}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-2 font-mono">
                Всего {p.total.toLocaleString("ru-RU")} · из них реальных (люди и боты) {real.toLocaleString("ru-RU")}
              </div>
            </div>
          );
        })}
        {data && !data.length && !form && <div className="text-muted-foreground text-sm">Опросов пока нет — нажмите «Новый опрос».</div>}
      </div>
    </div>
  );
};

export default PollsManager;
