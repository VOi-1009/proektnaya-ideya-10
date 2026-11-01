import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { COIN_META } from "@/lib/crypto";
import { AiTraderData, AiTraderSettings, fundFmt, fundRequest } from "@/lib/fund";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const COINS = ["bitcoin", "ethereum", "binancecoin", "ripple", "solana", "dogecoin", "hyperliquid", "zcash", "tron", "cardano", "chainlink", "stellar", "avalanche-2", "sui", "shiba-inu", "the-open-network", "hedera-hashgraph", "litecoin"];
const REASON: Record<string, string> = { stop: "стоп-лосс", take: "тейк-профит", manual: "вручную", liquidation: "ликвидация", time: "по времени", reset: "сброс" };
const tone = (v: number) => (v >= 0 ? "text-[#16C784]" : "text-[#EA3943]");
const sgn = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fundFmt(Math.abs(v))}`;

const Num = ({ label, hint, value, onChange, min, max, step }: { label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) => (
  <label className="space-y-1 block">
    <span className="text-xs text-muted-foreground">{label}</span>
    <input className={inputCls} type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    {hint && <span className="text-[10px] text-muted-foreground/80 block leading-snug">{hint}</span>}
  </label>
);

const AiTraderManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["ai-trader-admin", token],
    queryFn: () => fundRequest<AiTraderData>(token, "?action=ai_admin"),
    enabled: !!token,
    refetchInterval: 60_000,
  });
  const [f, setF] = useState<AiTraderSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (data && !f) setF(data.settings);
  }, [data, f]);

  const run = async (body: object, ok: string, after?: () => void) => {
    setBusy(true);
    try {
      const next = await fundRequest<AiTraderData>(token, "", body);
      qc.setQueryData(["ai-trader-admin", token], next);
      qc.invalidateQueries({ queryKey: ["trading-leaders"] });
      after?.();
      toast({ title: ok });
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!data || !f) return <p className="text-muted-foreground text-sm">Загружаю…</p>;
  const acc = data.account;
  const set = <K extends keyof AiTraderSettings>(key: K, v: AiTraderSettings[K]) => setF({ ...f, [key]: v });
  const toggleCoin = (id: string) => set("coins", f.coins.includes(id) ? f.coins.filter((c) => c !== id) : [...f.coins, id]);
  const fmtT = (t: number) => new Date(t * 1000).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const overdue = !!data.nextRun && data.nextRun * 1000 < Date.now();
  const nextRun = !f.enabled ? "бот выключен" : !data.nextRun ? "при ближайшем запуске" : overdue ? `${fmtT(data.nextRun)} (ждёт запуска)` : fmtT(data.nextRun);
  const lastRun = data.lastRun ? new Date(data.lastRun * 1000).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "ещё не было";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl text-white flex items-center gap-2"><Icon name="Bot" size={20} className="text-primary" /> AiTKA на бирже</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Бот торгует виртуальными USDT на общих условиях биржи: с тем же плечом и комиссией. Решения простые, по движению цены за сутки. Это игра, а не совет.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
          <Switch checked={f.enabled} onCheckedChange={(v) => set("enabled", v)} />
          Торговля включена
        </label>
      </div>

      {acc && (
        <div className="grid sm:grid-cols-5 gap-2">
          {[
            ["Капитал", `${fundFmt(acc.equity)} USDT`, ""],
            ["Свободно", `${fundFmt(acc.free)}`, ""],
            ["В сделках", `${fundFmt(acc.locked)}`, ""],
            ["Итог", `${sgn(acc.pnl)}`, tone(acc.pnl)],
            ["Доходность", `${acc.pnlPct > 0 ? "+" : ""}${acc.pnlPct.toFixed(2).replace(".", ",")}%`, tone(acc.pnlPct)],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-card border border-border rounded-lg px-3 py-2">
              <div className="text-[11px] text-muted-foreground">{l}</div>
              <div className={`font-mono text-sm ${c || "text-white"}`}>{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Wallet" size={15} className="text-primary" /> Ставки и баланс</h3>
          <div className="grid grid-cols-2 gap-3">
            <Num label="Стартовый баланс, USDT" hint="До него счёт возвращается при сбросе" value={f.startBalance} min={10} onChange={(v) => set("startBalance", v)} />
            <Num label="Ставка, % от свободных" value={f.betPercent} min={0.5} max={50} step={0.5} onChange={(v) => set("betPercent", v)} />
            <Num label="Максимальная ставка, USDT" value={f.maxBet} min={1} onChange={(v) => set("maxBet", v)} />
            <Num label="Плечо" hint="Не больше лимита раздела «БИРЖА»" value={f.leverage} min={1} max={100} onChange={(v) => set("leverage", v)} />
            <Num label="Открытых позиций сразу" value={f.maxPositions} min={1} max={10} onChange={(v) => set("maxPositions", v)} />
            <Num label="Проверка рынка, раз в минут" value={f.intervalMin} min={5} max={720} onChange={(v) => set("intervalMin", v)} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Brain" size={15} className="text-primary" /> Стратегия</h3>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Как выбирает сделки</span>
            <select className={inputCls} value={f.strategy} onChange={(e) => set("strategy", e.target.value as AiTraderSettings["strategy"])}>
              {Object.entries(data.strategies).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {f.strategy === "trend" && "Берёт монету с самым сильным движением за сутки: растёт — лонг, падает — шорт."}
            {f.strategy === "reversal" && "Ставит против движения: после роста — шорт, после падения — лонг."}
            {f.strategy === "long_only" && "Только покупает растущие монеты, шортов не открывает."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Num label="Движение за сутки от, %" hint="Слабее — не торгуем" value={f.minMovePct} min={0} max={50} step={0.5} onChange={(v) => set("minMovePct", v)} />
            <Num label="Держать не дольше, часов" value={f.holdHours} min={1} max={168} onChange={(v) => set("holdHours", v)} />
            <Num label="Стоп-лосс, %" hint="0 — без стопа" value={f.stopLossPct} min={0} max={50} step={0.5} onChange={(v) => set("stopLossPct", v)} />
            <Num label="Тейк-профит, %" hint="0 — без тейка" value={f.takeProfitPct} min={0} max={200} step={0.5} onChange={(v) => set("takeProfitPct", v)} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Coins" size={15} className="text-primary" /> Монеты для AiTKA</h3>
        <p className="text-[11px] text-muted-foreground">Если ничего не отмечено, бот выбирает из всех доступных на бирже.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {COINS.map((id) => (
            <label key={id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs cursor-pointer ${f.coins.includes(id) ? "border-primary/40 bg-primary/5 text-white" : "border-border text-muted-foreground"}`}>
              <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={f.coins.includes(id)} onChange={() => toggleCoin(id)} />
              <span className="truncate">{COIN_META[id]?.short ?? id}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Icon name="Users" size={15} className="text-primary" /> Публикации в сообществе</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <Switch checked={f.postToCommunity} onCheckedChange={(v) => set("postToCommunity", v)} className="mt-0.5" />
          <span>
            <span className="text-sm text-white block">Публиковать итоги сделок в сообществе</span>
            <span className="text-xs text-muted-foreground">Сделка с результатом от 3% к ставке публикуется сразу, остальные собираются, и публикуется самая заметная.</span>
          </span>
        </label>
        {f.postToCommunity && (
          <div className="max-w-xs">
            <Num label="Не реже чем раз в N закрытых сделок" value={f.postEvery} min={1} max={50} onChange={(v) => set("postEvery", v)} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button disabled={busy} className="font-semibold" onClick={() => run({ action: "ai_save", ...f }, "Настройки AiTKA сохранены")}>
          {busy && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
          Сохранить
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => run({ action: "ai_run" }, "Проверка рынка выполнена")}>
          Проверить рынок сейчас
        </Button>
        <span className="text-[11px] text-muted-foreground">Последняя проверка: {lastRun}</span>
        <span className={`text-[11px] ${overdue ? "text-[#FBBF24]" : "text-muted-foreground"}`}>Следующий круг: {nextRun}</span>
      </div>
      <div className={`rounded-lg border px-3 py-2 text-xs ${data.cron ? "border-[#16C784]/40 bg-[#16C784]/10 text-foreground" : "border-[#FBBF24]/40 bg-[#FBBF24]/10 text-foreground"}`}>
        {data.cron
          ? `Запуск по расписанию подключён: бот торгует сам каждые ${f.intervalMin} мин, даже когда на сайте никого нет.`
          : "Запуск по расписанию не подключён: бот работает только когда кто-то заходит на сайт. Подключите внешний таймер (ключ TRADING_CRON_SECRET)."}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm">Управление счётом</h3>
          <div className="flex gap-2">
            <input className={inputCls} type="number" placeholder="Сумма: плюс — пополнить, минус — забрать" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button variant="secondary" disabled={busy || !Number(amount)} onClick={() => run({ action: "ai_fund", amount: Number(amount) }, "Счёт AiTKA обновлён", () => setAmount(""))}>
              Применить
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="bg-transparent" disabled={busy || !acc?.positions.length} onClick={() => confirm("Закрыть все позиции AiTKA по текущим ценам?") && run({ action: "ai_close_all" }, "Позиции закрыты")}>
              Закрыть все позиции
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-[#EA3943]" disabled={busy} onClick={() => confirm(`Сбросить счёт AiTKA до ${fundFmt(f.startBalance)} USDT? Позиции будут закрыты.`) && run({ action: "ai_reset" }, "Счёт AiTKA сброшен")}>
              Сбросить счёт
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Сначала сохраните настройки, потом сбрасывайте: сброс берёт стартовый баланс из сохранённых.</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-white font-semibold text-sm mb-2">Открытые позиции</h3>
          {!acc?.positions.length ? (
            <p className="text-sm text-muted-foreground">Позиций нет.</p>
          ) : (
            <div className="divide-y divide-border">
              {acc.positions.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className={`text-xs font-semibold ${p.side === "long" ? "text-[#16C784]" : "text-[#EA3943]"}`}>{p.side === "long" ? "Лонг" : "Шорт"} x{p.leverage}</span>
                  <span className="text-white truncate flex-1">{COIN_META[p.coinId]?.ru ?? p.coinId}</span>
                  <span className="font-mono text-xs text-muted-foreground">{fundFmt(p.margin)}</span>
                  <span className={`font-mono text-xs ${tone(p.pnl)}`}>{sgn(p.pnl)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><Icon name="ScrollText" size={15} className="text-primary" /> Журнал кругов</h3>
        {!data.log?.length ? (
          <p className="text-sm text-muted-foreground">Записей пока нет: они появятся после следующего круга бота. Нажмите «Проверить рынок сейчас», чтобы увидеть первую запись.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.log.map((l, i) => (
              <div key={`${l.t}-${i}`} className="flex items-start gap-2 py-1.5 text-sm">
                <Icon name={l.kind === "open" ? "TrendingUp" : l.kind === "close" ? "CircleCheck" : "CirclePause"} size={14} className={`mt-0.5 flex-shrink-0 ${l.kind === "open" ? "text-[#16C784]" : l.kind === "close" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[11px] text-muted-foreground font-mono w-28 flex-shrink-0 mt-0.5">{new Date(l.t * 1000).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className={`flex-1 ${l.kind === "skip" ? "text-muted-foreground" : "text-white"}`}>{l.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-white font-semibold text-sm mb-2">Последние сделки</h3>
        {data.trades.length === 0 ? (
          <p className="text-sm text-muted-foreground">Сделок пока нет.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.trades.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className={`text-xs font-semibold w-16 ${t.side === "long" ? "text-[#16C784]" : "text-[#EA3943]"}`}>{t.side === "long" ? "Лонг" : "Шорт"} x{t.leverage}</span>
                <span className="text-white truncate flex-1">{COIN_META[t.coinId]?.ru ?? t.coinId}</span>
                <span className="text-[11px] text-muted-foreground">{REASON[t.reason] ?? t.reason}</span>
                <span className={`font-mono text-xs ${tone(t.pnl)}`}>{sgn(t.pnl)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiTraderManager;
