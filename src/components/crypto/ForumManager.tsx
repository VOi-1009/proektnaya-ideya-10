import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { LEVEL_NAMES, forumRequest } from "@/lib/forum";

interface Sec {
  id: number;
  parentId: number | null;
  title: string;
  description: string;
  sort: number;
  guestsRead: boolean;
  readPlan: number;
  readLevel: number;
  topicPlan: number;
  topicLevel: number;
  replyPlan: number;
  replyLevel: number;
  allowUsers: number[];
  allowNames: { id: number; name: string }[];
  topics: number;
}

const EMPTY: Sec = {
  id: 0, parentId: null, title: "", description: "", sort: 10, guestsRead: false,
  readPlan: 0, readLevel: 1, topicPlan: 0, topicLevel: 1, replyPlan: 0, replyLevel: 1, allowUsers: [], allowNames: [], topics: 0,
};
const inputCls = "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const Perm = ({ label, plan, level, onChange }: { label: string; plan: number; level: number; onChange: (plan: number, level: number) => void }) => (
  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
    <span className="text-sm text-white">{label}</span>
    <select
      className={inputCls}
      value={plan === 9 ? 9 : level}
      onChange={(e) => {
        const v = Number(e.target.value);
        onChange(v === 9 ? 9 : 0, v === 9 ? 1 : v);
      }}
    >
      {LEVEL_NAMES.slice(1, 6).map((n, i) => (
        <option key={n} value={i + 1}>{i === 0 ? "Любой статус" : `От «${n}»`}</option>
      ))}
      <option value={9}>Только администраторы</option>
    </select>
  </div>
);

const ForumManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const key = ["forum-admin", token];
  const { data } = useQuery({ queryKey: key, queryFn: () => forumRequest<{ sections: Sec[] }>(token, "&admin=1").then((d) => d.sections) });
  const [f, setF] = useState<Sec | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: number; name: string }[]>([]);

  const done = () => {
    qc.invalidateQueries({ queryKey: ["forum-admin"] });
    qc.invalidateQueries({ queryKey: ["forum-home"] });
  };

  const save = async () => {
    if (!f) return;
    setSaving(true);
    try {
      await forumRequest(token, "", { action: "section-save", ...f });
      toast({ title: "Раздел сохранён" });
      setF(null);
      done();
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Sec) => {
    if (!window.confirm(`Удалить «${s.title}» вместе с подразделами, темами и сообщениями?`)) return;
    try {
      await forumRequest(token, "", { action: "section-delete", id: s.id });
      toast({ title: "Раздел удалён" });
      done();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const search = async (v: string) => {
    setQ(v);
    if (v.trim().length < 1) return setFound([]);
    try {
      setFound((await forumRequest<{ users: { id: number; name: string }[] }>(token, `&find=${encodeURIComponent(v.trim())}`)).users);
    } catch {
      setFound([]);
    }
  };

  const roots = (data ?? []).filter((s) => !s.parentId);
  const needLabel = (plan: number, lvl: number) => (plan === 9 ? "только администраторы" : lvl > 1 ? `от «${LEVEL_NAMES[lvl]}»` : "любой статус");

  if (f)
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl">
        <button onClick={() => setF(null)} className="text-muted-foreground hover:text-white text-sm inline-flex items-center gap-1.5">
          <Icon name="ArrowLeft" size={15} /> К списку разделов
        </button>
        <h2 className="font-display text-2xl text-white">{f.id ? "Редактирование раздела" : f.parentId ? "Новый подраздел" : "Новый раздел"}</h2>
        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <input className={inputCls} value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Название" />
          <input className={inputCls} value={f.description} maxLength={300} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Описание (необязательно)" />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Родительский раздел</span>
              <select
                className={inputCls}
                value={f.parentId ?? 0}
                disabled={roots.some((r) => r.parentId === f.id) && !!f.id}
                onChange={(e) => setF({ ...f, parentId: Number(e.target.value) || null })}
              >
                <option value={0}>— основной раздел —</option>
                {roots.filter((r) => r.id !== f.id).map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Порядок (меньше — выше)</span>
              <input className={inputCls} value={f.sort} inputMode="numeric" onChange={(e) => setF({ ...f, sort: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) || 0 })} />
            </label>
          </div>
        </section>

        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Icon name="ShieldCheck" size={17} className="text-primary" /> Кто что может
          </h3>
          <div className="grid grid-cols-[110px_1fr] gap-2 text-[11px] text-muted-foreground uppercase tracking-wider">
            <span />
            <span>Статус на сайте</span>
          </div>
          <Perm label="Читать" plan={f.readPlan} level={f.readLevel} onChange={(p, l) => setF({ ...f, readPlan: p, readLevel: l })} />
          <Perm label="Создавать темы" plan={f.topicPlan} level={f.topicLevel} onChange={(p, l) => setF({ ...f, topicPlan: p, topicLevel: l })} />
          <Perm label="Отвечать" plan={f.replyPlan} level={f.replyLevel} onChange={(p, l) => setF({ ...f, replyPlan: p, replyLevel: l })} />
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <Switch checked={f.guestsRead} onCheckedChange={(v) => setF({ ...f, guestsRead: v })} className="mt-0.5" />
            <span>
              <span className="text-sm text-white block">Читать могут все вошедшие участники</span>
              <span className="text-xs text-muted-foreground">Игнорирует подписку и статус для чтения. Писать по-прежнему смогут только по правилам выше.</span>
            </span>
          </label>
          <p className="text-xs text-muted-foreground">Администраторы имеют полный доступ ко всем разделам. Для темы нужно выполнить оба условия: и подписку, и статус.</p>
        </section>

        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Icon name="UserCheck" size={17} className="text-primary" /> Личный доступ по списку
          </h3>
          <p className="text-xs text-muted-foreground">Эти участники получают полный доступ к разделу независимо от статуса.</p>
          <div className="flex flex-wrap gap-1.5">
            {f.allowUsers.map((id) => (
              <span key={id} className="inline-flex items-center gap-1.5 bg-primary/15 text-white text-xs rounded-full pl-2.5 pr-1.5 py-1">
                {f.allowNames.find((n) => n.id === id)?.name ?? `#${id}`} <span className="font-mono text-muted-foreground">#{id}</span>
                <button onClick={() => setF({ ...f, allowUsers: f.allowUsers.filter((x) => x !== id) })} className="hover:text-down">
                  <Icon name="X" size={12} />
                </button>
              </span>
            ))}
            {f.allowUsers.length === 0 && <span className="text-xs text-muted-foreground">Список пуст</span>}
          </div>
          <input className={inputCls} value={q} onChange={(e) => search(e.target.value)} placeholder="Найти участника по имени, почте или ID" />
          {found.length > 0 && (
            <div className="space-y-1">
              {found.filter((u) => !f.allowUsers.includes(u.id)).map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setF({ ...f, allowUsers: [...f.allowUsers, u.id], allowNames: [...f.allowNames, u] });
                    setQ("");
                    setFound([]);
                  }}
                  className="w-full text-left flex items-center gap-2 bg-rail/60 hover:bg-hover rounded px-3 py-2 text-sm text-white"
                >
                  <Icon name="Plus" size={14} /> {u.name} <span className="font-mono text-xs text-muted-foreground">#{u.id}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || f.title.trim().length < 2} className="font-semibold">
            {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
            Сохранить
          </Button>
          <Button variant="ghost" onClick={() => setF(null)} className="text-muted-foreground hover:text-white hover:bg-hover">
            Отмена
          </Button>
        </div>
      </div>
    );

  const row = (s: Sec, child?: boolean) => (
    <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${child ? "border-t border-border/60 pl-8" : "bg-rail/50"}`}>
      <Icon name={child ? "MessageSquare" : "FolderOpen"} size={17} className="text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold truncate">{s.title} <span className="text-[10px] text-muted-foreground font-mono font-normal">#{s.id} · {s.topics} тем</span></div>
        <div className="text-[11px] text-muted-foreground truncate">
          Читают: {s.guestsRead ? "все участники" : needLabel(s.readPlan, s.readLevel)} · Темы: {needLabel(s.topicPlan, s.topicLevel)} · Ответы: {needLabel(s.replyPlan, s.replyLevel)}
          {s.allowUsers.length > 0 && ` · по списку: ${s.allowUsers.length}`}
        </div>
      </div>
      {!child && (
        <button onClick={() => setF({ ...EMPTY, parentId: s.id, sort: 10 })} className="text-muted-foreground hover:text-white" title="Добавить подраздел">
          <Icon name="FolderPlus" size={16} />
        </button>
      )}
      <button onClick={() => setF({ ...s })} className="text-muted-foreground hover:text-white" title="Изменить">
        <Icon name="Pencil" size={16} />
      </button>
      <button onClick={() => remove(s)} className="text-muted-foreground hover:text-down" title="Удалить">
        <Icon name="Trash2" size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-white">Форум</h1>
          <p className="text-muted-foreground text-sm">Разделы и подразделы, кто их читает, создаёт темы и отвечает. Темы закрепляются и закрываются прямо на форуме.</p>
        </div>
        <Button onClick={() => setF({ ...EMPTY })} className="ml-auto font-semibold">
          <Icon name="Plus" size={16} className="mr-1.5" /> Новый раздел
        </Button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {!data ? (
          <p className="p-4 text-muted-foreground text-sm">Загружаю…</p>
        ) : roots.length === 0 ? (
          <p className="p-6 text-muted-foreground text-sm text-center">Разделов пока нет.</p>
        ) : (
          roots.map((r) => (
            <div key={r.id}>
              {row(r)}
              {(data ?? []).filter((s) => s.parentId === r.id).map((c) => row(c, true))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ForumManager;
