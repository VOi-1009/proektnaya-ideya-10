import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { visitsRequest } from "@/lib/visits";

interface Stat {
  visitors: number;
  views: number;
  newVisitors: number;
}

interface VisitsData {
  online: number;
  summary: Record<"today" | "yesterday" | "week" | "month" | "total", Stat>;
  daily: { day: string; visitors: number; views: number; newVisitors: number }[];
  pages: { name: string; count: number }[];
  referrers: { name: string; count: number }[];
  devices: { desktop: number; mobile: number };
  members: number;
  guests: number;
  days: number;
}

const PERIODS = [
  [7, "7 дней"],
  [30, "30 дней"],
  [90, "90 дней"],
] as const;

const PAGE_NAMES: Record<string, string> = { "/": "Главная", "/profile": "Личный кабинет", "/rating": "Рейтинг" };

const n = (v: number) => v.toLocaleString("ru-RU");
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

const Card = ({ title, s, accent }: { title: string; s?: Stat; accent?: boolean }) => (
  <div className={`rounded-lg border p-3 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{title}</div>
    <div className="text-2xl font-mono text-white mt-1">{s ? n(s.visitors) : "—"}</div>
    <div className="text-[11px] text-muted-foreground mt-0.5">
      {s ? `${n(s.views)} просм. · ${n(s.newVisitors)} новых` : ""}
    </div>
  </div>
);

const TopList = ({ title, icon, items, empty, label }: { title: string; icon: string; items: { name: string; count: number }[]; empty: string; label?: (v: string) => string }) => {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
        <Icon name={icon} size={15} className="text-primary" /> {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((i) => (
            <div key={i.name} className="relative rounded overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${(i.count / max) * 100}%` }} />
              <div className="relative flex items-center justify-between gap-2 px-2 py-1 text-sm">
                <span className="text-white truncate">{label ? label(i.name) : i.name}</span>
                <span className="font-mono text-muted-foreground text-xs">{n(i.count)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const VisitsManager = ({ token }: { token: string | null }) => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useQuery({
    queryKey: ["visits-admin", token, days],
    queryFn: () => visitsRequest<VisitsData>(token, `&days=${days}`),
    refetchInterval: 60_000,
  });

  if (error) return <p className="text-down text-sm">{(error as Error).message}</p>;
  if (isLoading || !data) return <Skeleton className="h-96 w-full bg-card" />;

  const s = data.summary;
  const dev = data.devices.desktop + data.devices.mobile || 1;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-white">Посетители сайта</h2>
        <span className="inline-flex items-center gap-2 text-sm text-white bg-card border border-border rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-up animate-pulse" /> Сейчас на сайте: <b className="font-mono">{n(data.online)}</b>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card title="Сегодня" s={s.today} accent />
        <Card title="Вчера" s={s.yesterday} />
        <Card title="7 дней" s={s.week} />
        <Card title="30 дней" s={s.month} />
        <Card title="Всего" s={s.total} />
      </div>
      <p className="text-[11px] text-muted-foreground">Крупное число — уникальные посетители. Повторный заход на ту же страницу в течение 30 минут не считается. Боты и визиты в админку не учитываются.</p>

      <section className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Icon name="BarChart3" size={15} className="text-primary" /> По дням
          </h3>
          <div className="flex gap-1 bg-rail rounded-md p-0.5">
            {PERIODS.map(([d, label]) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded text-xs ${days === d ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={12} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--hover))" }}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(v) => new Date(v as string).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                formatter={(v, name) => [n(Number(v)), name === "visitors" ? "Посетители" : "Просмотры"]}
              />
              <Bar dataKey="views" fill="hsl(var(--primary) / 0.3)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="visitors" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        <TopList title="Популярные страницы" icon="FileText" items={data.pages} empty="Пока нет данных" label={(v) => PAGE_NAMES[v] ?? v} />
        <TopList title="Откуда пришли" icon="Link" items={data.referrers} empty="Пока все заходы прямые" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <section className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Icon name="MonitorSmartphone" size={15} className="text-primary" /> Устройства
          </h3>
          <div className="flex h-3 rounded-full overflow-hidden bg-rail">
            <div className="bg-primary" style={{ width: `${(data.devices.desktop / dev) * 100}%` }} />
            <div className="bg-accent" style={{ width: `${(data.devices.mobile / dev) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span><Icon name="Monitor" size={12} className="inline mr-1" />Компьютеры: <b className="text-white font-mono">{n(data.devices.desktop)}</b></span>
            <span><Icon name="Smartphone" size={12} className="inline mr-1" />Телефоны: <b className="text-white font-mono">{n(data.devices.mobile)}</b></span>
          </div>
        </section>
        <section className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Icon name="Users" size={15} className="text-primary" /> Кто заходит
          </h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Участники с аккаунтом</span>
            <b className="text-white font-mono">{n(data.members)}</b>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Гости без входа</span>
            <b className="text-white font-mono">{n(data.guests)}</b>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VisitsManager;
