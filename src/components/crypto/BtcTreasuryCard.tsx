import { useCmcMetrics } from "@/lib/cmcMetrics";
import { cardCls, labelCls, valueCls } from "./summaryCard";

const fmtInt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const BtcTreasuryCard = () => {
  const { data } = useCmcMetrics();
  const t = data?.treasuries;
  return (
    <a
      href="https://coinmarketcap.com/ru/charts/bitcoin-treasuries/"
      target="_blank"
      rel="noreferrer"
      className={cardCls("border-metric-gold", true)}
      title={
        t
          ? `Общее количество удерживаемых Bitcoin: ${fmtInt(t.total)} BTC у ${t.companies} компаний${
              t.top ? `. Крупнейший держатель — ${t.top.name}: ${fmtInt(t.top.holdings)} BTC` : ""
            }`
          : "Общее количество удерживаемых Bitcoin"
      }
    >
      <div className={labelCls}>Общее количество удерживаемых Bitcoin</div>
      <div className={valueCls}>{t ? `${fmtInt(t.total)} BTC` : "—"}</div>
    </a>
  );
};

export default BtcTreasuryCard;
