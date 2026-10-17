import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Coin, COIN_META, fmtPct, fmtPrice } from "@/lib/crypto";
import { notificationsSupported, PriceAlertsApi } from "@/lib/alerts";
import Message from "../Message";
import { CoinLogo } from "../QuotesTable";

interface Props {
  coins: Coin[];
  live: boolean;
  api: PriceAlertsApi;
  go: (ch: string, coinId?: string) => void;
}

const parseNum = (s: string) => parseFloat(s.replace(/\s/g, "").replace(",", "."));
const fmtDate = (ts: number) =>
  new Date(ts).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const AlertsChannel = ({ coins, live, api, go }: Props) => {
  const { alerts, add, remove, clearTriggered } = api;
  const [coinId, setCoinId] = useState(coins[0]?.id ?? "bitcoin");
  const [target, setTarget] = useState("");
  const [err, setErr] = useState("");
  const [perm, setPerm] = useState(() => (notificationsSupported() ? Notification.permission : "denied"));

  const coin = coins.find((c) => c.id === coinId);
  const price = coin?.current_price ?? 0;
  const t = parseNum(target);
  const diff = !Number.isNaN(t) && price ? ((t - price) / price) * 100 : null;

  const active = alerts.filter((a) => !a.triggeredAt);
  const triggered = alerts.filter((a) => a.triggeredAt);

  const askPermission = async () => {
    if (!notificationsSupported()) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") toast({ title: "Уведомления включены", description: "Сообщим, даже если вкладка свёрнута." });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number.isNaN(t) || t <= 0) return setErr("Укажите целевую цену больше нуля");
    if (!price) return setErr("Курс монеты ещё загружается, попробуйте через пару секунд");
    if (Math.abs(t - price) / price < 0.0005) return setErr("Цель почти равна текущему курсу — укажите другую цену");
    setErr("");
    const a = add(coinId, t, price);
    setTarget("");
    toast({
      title: "Уведомление создано",
      description: `${COIN_META[coinId]?.ru ?? coinId}: сообщим, когда курс ${a.direction === "above" ? "поднимется до" : "опустится до"} ${fmtPrice(t, coinId)}`,
    });
    if (perm === "default") askPermission();
  };

  const quick = (pct: number) => price && setTarget(String(+(price * (1 + pct / 100)).toPrecision(6)));

  return (
    <div className="space-y-5">
      <Message author="Traderka Бот" time="Сегодня" icon="BellRing" bot>
        <p className="text-muted-foreground mb-3">
          Выберите монету и цену — сайт оповестит, когда курс её достигнет. Направление (рост или падение) определяется автоматически.
        </p>
        <form onSubmit={submit} className="bg-card border border-border rounded-lg p-4 max-w-2xl" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-[190px_1fr_auto] gap-2">
            <Select value={coinId} onValueChange={setCoinId}>
              <SelectTrigger className="bg-rail border-0 h-10 font-coin">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {coins.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-coin">
                    {COIN_META[c.id]?.short ?? c.symbol.toUpperCase()} · {COIN_META[c.id]?.ru ?? c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                if (err) setErr("");
              }}
              inputMode="decimal"
              placeholder="Целевая цена, $"
              className="bg-rail rounded px-3 h-10 font-mono text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground placeholder:font-body"
            />
            <Button type="submit" className="h-10 font-semibold">
              <Icon name="BellPlus" size={16} className="mr-1.5" />
              Создать
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 text-xs">
            <span className="text-muted-foreground">
              Сейчас: <span className="font-mono text-white">{price ? fmtPrice(price, coinId) : "—"}</span>
              {diff !== null && Math.abs(diff) > 0 && (
                <span className={`font-mono ml-2 ${diff > 0 ? "text-up" : "text-down"}`}>
                  {diff > 0 ? "↑ рост" : "↓ падение"} на {fmtPct(Math.abs(diff)).replace("+", "")}
                </span>
              )}
            </span>
            <span className="flex gap-1 ml-auto">
              {[-10, -5, 5, 10].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => quick(p)}
                  className="font-mono px-2 py-0.5 rounded bg-rail text-muted-foreground hover:text-white"
                >
                  {p > 0 ? "+" : ""}
                  {p}%
                </button>
              ))}
            </span>
          </div>
          {err && <div className="text-down text-xs mt-2">{err}</div>}
        </form>
      </Message>

      {notificationsSupported() && perm !== "granted" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-primary/10 border border-primary/30 rounded-lg p-4 max-w-3xl">
          <Icon name="BellRing" size={22} className="text-primary flex-shrink-0" />
          <div className="flex-1 text-sm">
            <div className="text-white font-semibold">Уведомления в браузере</div>
            <div className="text-muted-foreground">
              {perm === "denied"
                ? "Уведомления запрещены в настройках браузера — оповещение появится только на открытой странице."
                : "Разрешите уведомления, чтобы узнать о цели, даже когда вкладка свёрнута."}
            </div>
          </div>
          {perm === "default" && (
            <Button onClick={askPermission} className="font-semibold">
              Разрешить
            </Button>
          )}
        </div>
      )}

      {!live && (
        <div className="text-xs text-accent flex items-center gap-1.5">
          <Icon name="TriangleAlert" size={14} />
          Живые котировки временно недоступны — проверка целей возобновится, как только курс обновится.
        </div>
      )}

      <section>
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
          Активные — {active.length}
        </h3>
        <div className="bg-card border border-border rounded-lg divide-y divide-white/5">
          {active.map((a) => {
            const c = coins.find((x) => x.id === a.coinId);
            const now = c?.current_price ?? a.createdPrice;
            const total = Math.abs(a.target - a.createdPrice) || 1;
            const passed = a.direction === "above" ? now - a.createdPrice : a.createdPrice - now;
            const progress = Math.max(0, Math.min(100, (passed / total) * 100));
            const left = ((a.target - now) / now) * 100;
            return (
              <div key={a.id} className="p-3 sm:px-4 flex items-center gap-3">
                <button onClick={() => go("market", a.coinId)} className="flex-shrink-0">
                  {c ? <CoinLogo coin={c} size={32} /> : <span className="w-8 h-8 rounded-full bg-primary block" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-white font-medium font-coin">{COIN_META[a.coinId]?.ru ?? a.coinId}</span>
                    <span className={`text-xs flex items-center gap-0.5 ${a.direction === "above" ? "text-up" : "text-down"}`}>
                      <Icon name={a.direction === "above" ? "TrendingUp" : "TrendingDown"} size={13} />
                      {a.direction === "above" ? "выше" : "ниже"}
                    </span>
                    <span className="font-mono text-white">{fmtPrice(a.target, a.coinId)}</span>
                  </div>
                  <div className="h-1.5 bg-rail rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                    сейчас {fmtPrice(now, a.coinId)} · осталось {fmtPct(left).replace("+", "")} · с {fmtDate(a.createdAt)}
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-down p-1" aria-label="Удалить">
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
            );
          })}
          {!active.length && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Icon name="BellOff" size={26} className="mx-auto mb-2 opacity-60" />
              Активных уведомлений нет — создайте первое выше.
            </div>
          )}
        </div>
      </section>

      {triggered.length > 0 && (
        <section>
          <div className="flex items-center mb-2">
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Сработали — {triggered.length}
            </h3>
            <button onClick={clearTriggered} className="ml-auto text-xs text-muted-foreground hover:text-white">
              Очистить
            </button>
          </div>
          <div className="bg-card border border-border rounded-lg divide-y divide-white/5">
            {triggered.map((a) => (
              <div key={a.id} className="p-3 sm:px-4 flex items-center gap-3 text-sm">
                <Icon name="BellRing" size={18} className="text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-white font-coin">{COIN_META[a.coinId]?.ru ?? a.coinId}</span>
                  <span className="text-muted-foreground"> достиг </span>
                  <span className="font-mono text-white">{fmtPrice(a.target, a.coinId)}</span>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {fmtDate(a.triggeredAt!)} · курс был {fmtPrice(a.triggeredPrice!, a.coinId)}
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-down p-1" aria-label="Удалить">
                  <Icon name="X" size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground/70 pb-2">
        Курс проверяется каждую минуту, пока сайт открыт. Уведомления хранятся в этом браузере.
      </p>
    </div>
  );
};

export default AlertsChannel;
