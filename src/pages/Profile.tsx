import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { PROFILE_URL, useAuth } from "@/lib/auth";
import { COIN_META } from "@/lib/crypto";
import UserAvatar from "@/components/crypto/UserAvatar";
import { LEVELS } from "@/lib/status";
import { Achievement } from "@/components/crypto/Achievements";
import ProfileRewards from "@/components/crypto/ProfileRewards";
import FounderBadge from "@/components/crypto/FounderBadge";
import SupporterBadge from "@/components/crypto/SupporterBadge";
import ContactLinks from "@/components/crypto/ContactLinks";
import { CONTACT_FIELDS, EXPERIENCE } from "@/lib/contacts";

interface ProfileData {
  id: number;
  email: string;
  name: string;
  avatar: string;
  bio: string;
  city: string;
  favoriteCoin: string;
  createdAt: string;
  stats: { days: number; coins: number; filled: number; fields: number; streak?: number; bestStreak?: number; minutes?: number };
  achievements?: Achievement[];
  special?: Achievement[];
  founder?: number | null;
  foundersTaken?: number;
  supporter?: number | null;
  creator?: boolean;
  promo?: string;
  headline?: string;
  experience?: string;
  interests?: string;
  contacts?: Record<string, string>;
  status: { level: number; title: string; points: number; current: number; next: number | null; nextTitle: string | null; manual?: boolean };
}

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const plural = (n: number, forms: [string, string, string]) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
};

const Profile = () => {
  const { user, token, ready, setAuthOpen, patchUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({ name: "", bio: "", city: "", favoriteCoin: "", headline: "", experience: "", interests: "", contacts: {} as Record<string, string> });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = (p: ProfileData) => {
    setProfile(p);
    setForm({ name: p.name, bio: p.bio, city: p.city, favoriteCoin: p.favoriteCoin, headline: p.headline ?? "", experience: p.experience ?? "", interests: p.interests ?? "", contacts: p.contacts ?? {} });
    patchUser({ name: p.name, avatar: p.avatar, level: p.status.level, statusTitle: p.status.title });
  };

  const call = async (body?: object) => {
    const r = await fetch(PROFILE_URL, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "X-Auth-Token": token ?? "" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
    return data.profile as ProfileData;
  };

  useEffect(() => {
    if (!ready || !token) return;
    call()
      .then(apply)
      .catch((e) => setErr((e as Error).message));
  }, [ready, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length > 60) return toast({ title: "Имя слишком длинное", variant: "destructive" });
    setSaving(true);
    try {
      apply(await call({ action: "update", ...form }));
      toast({ title: "Профиль сохранён" });
    } catch (e) {
      toast({ title: "Не сохранилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return toast({ title: "Подойдёт JPG, PNG или WEBP", variant: "destructive" });
    if (file.size > 3 * 1024 * 1024) return toast({ title: "Картинка должна быть до 3 МБ", variant: "destructive" });
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        apply(await call({ action: "avatar", contentType: file.type, data: reader.result }));
        toast({ title: "Аватар обновлён" });
      } catch (e) {
        toast({ title: "Не удалось загрузить", description: (e as Error).message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      apply(await call({ action: "remove-avatar" }));
    } finally {
      setUploading(false);
    }
  };

  const header = (
    <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-display font-black text-xl sm:text-2xl leading-none">
          Т
        </div>
        <span className="font-display text-lg sm:text-xl text-white tracking-wide">
          TRADERKA<span className="text-primary">.RU</span>
        </span>
      </Link>
      <Button variant="ghost" asChild className="text-muted-foreground hover:text-white hover:bg-hover">
        <Link to="/">
          <Icon name="ArrowLeft" size={16} className="mr-2" />
          На сайт
        </Link>
      </Button>
    </nav>
  );

  if (ready && !user) {
    return (
      <div className="min-h-screen bg-background font-body">
        {header}
        <div className="max-w-md mx-auto mt-20 bg-card border border-border rounded-xl p-8 text-center">
          <Icon name="UserRound" size={40} className="mx-auto text-primary mb-3" />
          <h1 className="font-display text-xl text-white mb-2">Личный кабинет</h1>
          <p className="text-muted-foreground text-sm mb-5">Войдите, чтобы видеть свой статус и редактировать профиль.</p>
          <Button className="w-full font-semibold" onClick={() => setAuthOpen(true)}>
            Войти
          </Button>
        </div>
      </div>
    );
  }

  const s = profile?.status;
  const lvIdx = s ? s.level - 1 : 0;
  const from = LEVELS[lvIdx < LEVELS.length - 1 ? lvIdx : lvIdx - 1].color;
  const to = LEVELS[lvIdx < LEVELS.length - 1 ? lvIdx + 1 : lvIdx].color;
  const canEditAvatar = !!profile && !!s && (s.level < 7 || profile.id === 2);
  const progress = s ? (s.next ? ((s.points - s.current) / (s.next - s.current)) * 100 : 100) : 0;
  const since = profile ? new Date(profile.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {header}
      <main className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-5">
        {err && <div className="bg-down/10 text-down border border-down/30 rounded-lg p-4 text-sm">{err}</div>}

        {!profile && !err ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full bg-card" />
            <Skeleton className="h-64 w-full bg-card" />
          </div>
        ) : profile && s ? (
          <>
            <section className="relative overflow-hidden bg-card border border-border rounded-2xl animate-fade-in">
              <div className="h-28 sm:h-36" style={{ background: `linear-gradient(90deg, ${from}66, ${to}55)` }} />
              <div className="px-5 sm:px-8 pb-6 -mt-14 sm:-mt-16 flex flex-col lg:flex-row gap-6 lg:items-end">
                <div className="relative self-start flex-shrink-0">
                  <UserAvatar name={profile.name} email={profile.email} avatar={profile.avatar} level={s.level} online dot="lg" className="w-28 h-28 sm:w-32 sm:h-32 text-5xl" />
                  {canEditAvatar && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center border-4 border-card hover:brightness-110"
                    aria-label="Сменить аватар"
                  >
                    <Icon name={uploading ? "Loader2" : "Camera"} size={16} className={uploading ? "animate-spin" : ""} />
                  </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-2xl sm:text-3xl text-white truncate">{profile.name || "Без имени"}</h1>
                  {profile.headline && <div className="text-foreground mt-1">{profile.headline}</div>}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm mt-1">
                    {profile.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="Mail" size={13} />
                        {profile.email}
                      </span>
                    )}
                    {profile.city && (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="MapPin" size={13} />
                        {profile.city}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="CalendarDays" size={13} />с нами с {since}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${LEVELS[s.level - 1].cls}`}>
                      <Icon name={LEVELS[s.level - 1].icon} size={14} />
                      {s.title}
                    </span>
                    <SupporterBadge no={profile.supporter} creator={profile.creator} />
                    <FounderBadge no={profile.founder} />
                  </div>
                  <ContactLinks contacts={profile.contacts} className="mt-4" />
                  {profile.avatar && canEditAvatar && (
                    <button onClick={removeAvatar} className="text-xs text-muted-foreground hover:text-down mt-3">
                      Удалить аватар
                    </button>
                  )}
                </div>
                <div className="lg:w-72 bg-rail rounded-xl p-4 flex-shrink-0">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Очки активности</span>
                    <span className="font-mono text-white">{s.points}</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-hover" />
                  <div className="text-xs text-muted-foreground mt-2">
                    {s.next ? (
                      <>
                        До статуса «{s.nextTitle}» — <span className="text-white font-mono">{s.next - s.points}</span>
                      </>
                    ) : (
                      "Максимальный статус"
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <form onSubmit={save} className="lg:col-span-2 xl:col-span-3 bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-6">
                <div>
                  <h2 className="font-display text-lg text-white mb-4 flex items-center gap-2">
                    <Icon name="UserRound" size={18} className="text-primary" />
                    Личная информация
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">Имя или ник</span>
                      <input className={inputCls} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Как к вам обращаться" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">Город</span>
                      <input className={inputCls} maxLength={100} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Например, Москва" />
                    </label>
                    <label className="block md:col-span-2 xl:col-span-1">
                      <span className="text-xs text-muted-foreground mb-1 block">Девиз или род занятий</span>
                      <input className={inputCls} maxLength={120} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Например, свинг-трейдер, инвестор в BTC" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">Опыт в трейдинге</span>
                      <select className={inputCls} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })}>
                        {EXPERIENCE.map((x) => (
                          <option key={x.value} value={x.value}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">Любимая монета</span>
                      <select className={inputCls} value={form.favoriteCoin} onChange={(e) => setForm({ ...form, favoriteCoin: e.target.value })}>
                        <option value="">Не выбрана</option>
                        {Object.entries(COIN_META).map(([id, m]) => (
                          <option key={id} value={id}>
                            {m.ru} ({m.short})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">Интересы</span>
                      <input className={inputCls} maxLength={300} value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="DeFi, NFT, технический анализ" />
                    </label>
                  </div>
                  <label className="block mt-4">
                    <span className="text-xs text-muted-foreground mb-1 flex justify-between">
                      <span>О себе</span>
                      <span>{form.bio.length}/1000</span>
                    </span>
                    <textarea
                      className={`${inputCls} h-32 py-2 resize-none`}
                      maxLength={1000}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Опыт в трейдинге, стратегия, цели, интересы"
                    />
                  </label>
                </div>

                <div>
                  <h2 className="font-display text-lg text-white mb-1 flex items-center gap-2">
                    <Icon name="Link" size={18} className="text-primary" />
                    Контакты и ссылки
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">Только ссылки на соцсети и сайты, видны вошедшим пользователям.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {CONTACT_FIELDS.map((f) => (
                      <label key={f.key} className="block">
                        <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Icon name={f.icon} fallback="Link" size={12} className="text-primary" />
                          {f.label}
                        </span>
                        <input
                          className={inputCls}
                          maxLength={200}
                          value={form.contacts[f.key] ?? ""}
                          onChange={(e) => setForm({ ...form, contacts: { ...form.contacts, [f.key]: e.target.value } })}
                          placeholder={f.placeholder}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user?.isAdmin && (
                    <Button type="button" variant="outline" asChild className="bg-transparent border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">
                      <Link to="/admin">
                        <Icon name="ShieldCheck" size={16} className="mr-2" />
                        Админ-панель
                      </Link>
                    </Button>
                  )}
                  <Button type="submit" disabled={saving} className="font-semibold">
                    {saving && <Icon name="Loader2" size={16} className="mr-2 animate-spin" />}
                    Сохранить
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-transparent border-input text-foreground hover:bg-hover hover:text-white"
                    onClick={async () => {
                      await logout();
                      navigate("/");
                    }}
                  >
                    <Icon name="LogOut" size={16} className="mr-2" />
                    Выйти
                  </Button>
                </div>
              </form>

              <div className="space-y-5 self-start">
              <section className="bg-card border border-border rounded-2xl p-5 sm:p-6 ">
                <h2 className="font-display text-lg text-white mb-4">Ваша активность</h2>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: "CalendarCheck", label: "Дней на сайте", value: `${profile.stats.days} ${plural(profile.stats.days, ["день", "дня", "дней"])}`, hint: "+10 очков за день" },
                    { icon: "Clock", label: "Время на сайте", value: `${profile.stats.minutes ?? 0} мин`, hint: "+2 очка за 10 минут" },
                    { icon: "Wallet", label: "Монет в портфеле", value: String(profile.stats.coins), hint: "+5 за позицию" },
                    { icon: "UserCheck", label: "Заполнен профиль", value: `${profile.stats.filled} из ${profile.stats.fields}`, hint: "+6 за поле" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                        <Icon name={r.icon} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white">{r.value}</div>
                        <div className="text-muted-foreground text-xs">
                          {r.label} · {r.hint}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const mins = profile.stats.minutes ?? 0;
                  const pct = Math.min(100, (mins / 1000) * 100);
                  return (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-white flex items-center gap-1.5">
                          <Icon name="Telescope" size={14} className="text-accent" /> До достижения «Смотритель»
                        </span>
                        <span className="text-muted-foreground font-mono">{Math.min(mins, 1000)} / 1000</span>
                      </div>
                      <div className="h-1.5 bg-rail rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-muted-foreground text-[11px] mt-1.5">
                        {mins >= 1000 ? "Достижение получено" : `Осталось ${1000 - mins} мин`}
                      </div>
                    </div>
                  );
                })()}
              </section>
              <ProfileRewards level={s.level} achievements={profile.achievements} special={profile.special} founder={profile.founder} foundersTaken={profile.foundersTaken} promo={profile.promo} streak={profile.stats.streak ?? 0} />
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default Profile;