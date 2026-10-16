import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Coin, COIN_META, fmtPct, fmtPrice } from "@/lib/crypto";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { PORTFOLIO_URL, useAuth } from "@/lib/auth";
import Message from "../Message";
import PortfolioChart from "../PortfolioChart";
import { CoinLogo } from "../QuotesTable";

interface Holding {
  id: string;
  coinId: string;
  amount: number;
  buyPrice: number;
}

const KEY = "svecha-portfolio";

const loadHoldings = (): Holding[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const fmtUsd = (v: number, sign = false) => {
  const abs = Math.abs(v);
  const s = "$" + abs.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!sign) return (v < 0 ? "−" : "") + s;
  return (v > 0 ? "+" : v < 0 ? "−" : "") + s;
};

const fmtAmount = (v: number) => v.toLocaleString("ru-RU", { maximumFractionDigits: 8 });

const parseNum = (s: string) => parseFloat(s.replace(/\s/g, "").replace(",", "."));

const PortfolioChannel = ({ coins, go }: { coins: Coin[]; go: (ch: string, coinId?: string) => void }) => {
  const { user, token, ready, setAuthOpen } = useAuth();
  const [local, setLocal] = useState<Holding[]>(loadHoldings);
  const [remote, setRemote] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coinId, setCoinId] = useState(coins[0]?.id ?? "bitcoin");
  const [amount, setAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [err, setErr] = useState("");

  const holdings = user ? remote : local;

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(local));
  }, [local]);

  const api = async (method: string, opts: { body?: unknown; id?: string } = {}) => {
    const r = await fetch(PORTFOLIO_URL + (opts.id ? `?id=${opts.id}` : ""), {
      method,
      headers: { "Content-Type": "application/json", "X-Auth-Token": token ?? "" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
    return data.holdings as Holding[];
  };

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    setLoading(true);
    const pending = loadHoldings();
    if (pending.length) localStorage.setItem(KEY, "[]");
    const req = pending.length
      ? api("POST", { body: { items: pending.map(({ coinId, amount, buyPrice }) => ({ coinId, amount, buyPrice })) } })
      : api("GET");
    req
      .then((list) => {
        if (cancelled) return;
        setRemote(list);
        if (pending.length) {
          setLocal([]);
          toast({ title: "Портфель перенесён в аккаунт", description: `Позиций добавлено: ${pending.length}` });
        }
      })
      .catch((e) => {
        if (pending.length) localStorage.setItem(KEY, JSON.stringify(pending));
        if (!cancelled) toast({ title: "Ошибка", description: (e as Error).message, variant: "destructive" });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const priceOf = (id: string) => coins.find((c) => c.id === id)?.current_price ?? 0;

  const rows = useMemo(
    () =>
      holdings.map((h) => {
        const coin = coins.find((c) => c.id === h.coinId);
        const price = coin?.current_price ?? 0;
        const value = h.amount * price;
        const cost = h.amount * h.buyPrice;
        const pnl = value - cost;
        const pnlPct = cost ? (pnl / cost) * 100 : 0;
        const ch24 = coin?.price_change_percentage_24h ?? 0;
        const day = value - value / (1 + ch24 / 100);
        return { ...h, coin, price, value, cost, pnl, pnlPct, day };
      }),
    [holdings, coins]
  );

  const total = rows.reduce((s, r) => s + r.value, 0);
  const invested = rows.reduce((s, r) => s + r.cost, 0);
  const pnl = total - invested;
  const pnlPct = invested ? (pnl / invested) * 100 : 0;
  const day = rows.reduce((s, r) => s + r.day, 0);
  const dayPct = total - day ? (day / (total - day)) * 100 : 0;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseNum(amount);
    const p = buyPrice.trim() ? parseNum(buyPrice) : priceOf(coinId);
    if (Number.isNaN(a) || a <= 0) return setErr("Укажите количество монет больше нуля");
    if (Number.isNaN(p) || p <= 0) return setErr("Цена покупки должна быть больше нуля");
    setErr("");
    if (user) {
      setSaving(true);
      try {
        setRemote(await api("POST", { body: { coinId, amount: a, buyPrice: p } }));
      } catch (e) {
        setSaving(false);
        return setErr((e as Error).message);
      }
      setSaving(false);
    } else {
      setLocal((list) => [...list, { id: `${Date.now()}`, coinId, amount: a, buyPrice: p }]);
    }
    setAmount("");
    setBuyPrice("");
    toast({ title: "Монета добавлена", description: `${fmtAmount(a)} ${COIN_META[coinId]?.short ?? coinId} по ${fmtPrice(p)}` });
  };

  const remove = async (id: string) => {
    if (!user) return setLocal((list) => list.filter((h) => h.id !== id));
    const prev = remote;
    setRemote((list) => list.filter((h) => h.id !== id));
    try {
      setRemote(await api("DELETE", { id }));
    } catch (e) {
      setRemote(prev);
      toast({ title: "Не удалось удалить", description: (e as Error).message, variant: "destructive" });
    }
  };

  const upCls = (v: number) => (v >= 0 ? "text-up" : "text-down");

  return (
    <div className="space-y-5">
      {ready && !user && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-primary/10 border border-primary/30 rounded-lg p-4 animate-fade-in">
          <Icon name="Cloud" size={22} className="text-primary flex-shrink-0" />
          <div className="flex-1 text-sm">
            <div className="text-white font-semibold">Сохраните портфель в аккаунте</div>
            <div className="text-muted-foreground">
              Войдите по почте — монеты будут доступны с телефона и компьютера. Уже добавленные позиции перенесутся автоматически.
            </div>
          </div>
          <Button onClick={() => setAuthOpen(true)} className="font-semibold">
            <Icon name="LogIn" size={16} className="mr-1.5" />
            Войти
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 animate-fade-in">
        <div className="bg-card border border-border rounded-lg p-4 border-l-4 border-l-primary">
          <div className="text-muted-foreground text-xs">Стоимость портфеля</div>
          <div className="font-mono text-2xl text-white tabular mt-1">{fmtUsd(total)}</div>
          <div className={`font-mono text-xs tabular mt-1 ${upCls(day)}`}>
            {fmtUsd(day, true)} ({fmtPct(dayPct)}) за 24ч
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 border-l-4 border-l-accent">
          <div className="text-muted-foreground text-xs">Вложено</div>
          <div className="font-mono text-2xl text-white tabular mt-1">{fmtUsd(invested)}</div>
          <div className="text-xs text-muted-foreground mt-1">Позиций: {holdings.length}</div>
        </div>
        <div className={`bg-card border border-border rounded-lg p-4 border-l-4 ${pnl >= 0 ? "border-l-up" : "border-l-down"}`}>
          <div className="text-muted-foreground text-xs">{pnl >= 0 ? "Прибыль" : "Убыток"}</div>
          <div className={`font-mono text-2xl tabular mt-1 ${upCls(pnl)}`}>{fmtUsd(pnl, true)}</div>
          <div className={`font-mono text-xs tabular mt-1 ${upCls(pnl)}`}>{fmtPct(pnlPct)} за всё время</div>
        </div>
      </div>

      <PortfolioChart holdings={holdings} coins={coins} />

      {total > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-muted-foreground text-xs mb-2">Распределение активов</div>
          <div className="flex h-3 rounded-full overflow-hidden bg-rail">
            {rows
              .filter((r) => r.value > 0)
              .map((r) => (
                <div
                  key={r.id}
                  style={{ width: `${(r.value / total) * 100}%`, background: COIN_META[r.coinId]?.color ?? "#888" }}
                  title={`${COIN_META[r.coinId]?.short}: ${((r.value / total) * 100).toFixed(1)}%`}
                />
              ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
            {Object.entries(
              rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.coinId]: (acc[r.coinId] ?? 0) + r.value }), {})
            ).map(([id, v]) => (
              <span key={id} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ background: COIN_META[id]?.color ?? "#888" }} />
                {COIN_META[id]?.short ?? id}
                <span className="font-mono text-white">{((v / total) * 100).toFixed(1).replace(".", ",")}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <Message author="Traderka Бот" time="Сегодня" icon="Wallet" bot>
        <p className="text-muted-foreground mb-3">
          Добавьте купленные монеты — я посчитаю текущую стоимость и результат по живому курсу. Если не указать цену покупки, возьму текущую.
        </p>
        <form onSubmit={add} className="bg-card border border-border rounded-lg p-4 max-w-2xl" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr_1fr_auto] gap-2">
            <Select value={coinId} onValueChange={setCoinId}>
              <SelectTrigger className="bg-rail border-0 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {coins.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {COIN_META[c.id]?.short ?? c.symbol.toUpperCase()} · {COIN_META[c.id]?.ru ?? c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (err) setErr("");
              }}
              inputMode="decimal"
              placeholder="Количество"
              className="bg-rail rounded px-3 h-10 font-mono text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground placeholder:font-body"
            />
            <input
              value={buyPrice}
              onChange={(e) => {
                setBuyPrice(e.target.value);
                if (err) setErr("");
              }}
              inputMode="decimal"
              placeholder={`Цена, сейчас ${fmtPrice(priceOf(coinId))}`}
              className="bg-rail rounded px-3 h-10 font-mono text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground placeholder:font-body"
            />
            <Button type="submit" disabled={saving} className="h-10 font-semibold">
              <Icon name={saving ? "Loader2" : "Plus"} size={16} className={`mr-1 ${saving ? "animate-spin" : ""}`} />
              Добавить
            </Button>
          </div>
          {err && <div className="text-down text-xs mt-2">{err}</div>}
        </form>
      </Message>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-muted-foreground text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Монета</th>
                <th className="px-3 py-2 text-right font-medium">Количество</th>
                <th className="px-3 py-2 text-right font-medium">Покупка / сейчас</th>
                <th className="px-3 py-2 text-right font-medium">Стоимость</th>
                <th className="px-3 py-2 text-right font-medium">Результат</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-hover/60 transition-colors">
                  <td className="px-3 py-2.5">
                    <button onClick={() => go("market", r.coinId)} className="flex items-center gap-2.5 text-left">
                      {r.coin && <CoinLogo coin={r.coin} />}
                      <div>
                        <div className="text-white font-medium leading-tight hover:underline">{COIN_META[r.coinId]?.ru ?? r.coinId}</div>
                        <div className="text-muted-foreground text-xs font-mono">{COIN_META[r.coinId]?.short}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-white tabular">{fmtAmount(r.amount)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular">
                    <div className="text-muted-foreground text-xs">{fmtPrice(r.buyPrice)}</div>
                    <div className="text-white">{fmtPrice(r.price)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-white tabular">{fmtUsd(r.value)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono tabular ${upCls(r.pnl)}`}>
                    <div>{fmtUsd(r.pnl, true)}</div>
                    <div className="text-xs">{fmtPct(r.pnlPct)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-down" aria-label="Удалить">
                      <Icon name="Trash2" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    {loading ? (
                      <>
                        <Icon name="Loader2" size={28} className="mx-auto mb-2 opacity-60 animate-spin" />
                        Загружаю ваш портфель…
                      </>
                    ) : (
                      <>
                        <Icon name="Wallet" size={28} className="mx-auto mb-2 opacity-60" />
                        Портфель пока пуст — добавьте первую монету выше.
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70 pb-2">
        {user ? `Портфель сохранён в аккаунте ${user.email}.` : "Без входа портфель хранится только в этом браузере."} Расчёты приблизительные и не являются инвестиционной рекомендацией.
      </p>
    </div>
  );
};

export default PortfolioChannel;