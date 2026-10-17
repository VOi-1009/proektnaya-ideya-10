import { altLabel, useCmcMetrics } from "@/lib/cmcMetrics";

const fmtInt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const Empty = ({ border }: { border: string }) => (
  <div className={`bg-card rounded-lg px-3 py-2 border-l-4 ${border} min-h-[64px] flex items-center`}>
    <div className="text-muted-foreground/50 text-xs">Скоро</div>
  </div>
);

const MarketMetricsRow = () => {
  const { data } = useCmcMetrics();
  const t = data?.treasuries;
  const a = data?.altseason;
  const av = a?.value ?? null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 mt-2">
      <a
        href="https://coinmarketcap.com/ru/charts/bitcoin-treasuries/"
        target="_blank"
        rel="noreferrer"
        className="bg-card rounded-lg px-3 py-2 border-l-4 border-amber-400 hover:bg-hover transition-colors"
        title={t?.top ? `Крупнейший держатель — ${t.top.name}: ${fmtInt(t.top.holdings)} BTC` : undefined}
      >
        <div className="text-muted-foreground text-xs leading-tight">Общее количество удерживаемых Bitcoin</div>
        <div className="font-mono text-white tabular mt-1">{t ? `${fmtInt(t.total)} BTC` : "—"}</div>
        {t && <div className="text-muted-foreground text-[9px] font-mono mt-1 truncate">у {t.companies} компаний</div>}
      </a>

      <a
        href="https://coinmarketcap.com/ru/charts/altcoin-season-index/"
        target="_blank"
        rel="noreferrer"
        className="bg-card rounded-lg px-3 py-2 border-l-4 border-violet-400 hover:bg-hover transition-colors"
        title="Индекс альтсезона: 0 — сезон биткоина, 100 — сезон альткоинов"
      >
        <div className="text-muted-foreground text-xs truncate">Индекс альтсезона</div>
        {av !== null ? (
          <>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono tabular text-lg leading-none text-violet-300">{av}</span>
              <span className="text-white text-xs truncate">{altLabel(av)}</span>
            </div>
            <div className="relative h-1.5 rounded-full mt-2 bg-gradient-to-r from-orange-400 via-slate-400 to-violet-400">
              <span
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-background"
                style={{ left: `${av}%` }}
              />
            </div>
            {a?.yesterday != null && <div className="text-muted-foreground text-[9px] font-mono mt-1.5">вчера: {a.yesterday}</div>}
          </>
        ) : (
          <div className="font-mono text-muted-foreground mt-1">—</div>
        )}
      </a>

      <Empty border="border-sky-400" />
      <Empty border="border-emerald-400" />
      <Empty border="border-pink-400" />
    </div>
  );
};

export default MarketMetricsRow;