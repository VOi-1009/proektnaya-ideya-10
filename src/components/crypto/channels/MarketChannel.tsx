import { Coin } from "@/lib/crypto";
import PriceChart from "../PriceChart";
import QuotesTable from "../QuotesTable";
import Message from "../Message";
import ListingSoon from "../ListingSoon";
import PremarketCard from "../PremarketCard";
import StakingCard from "../trading/StakingCard";

interface Props {
  coins: Coin[];
  selected: string;
  onSelect: (id: string) => void;
  live: boolean;
}

const MarketChannel = ({ coins, selected, onSelect, live }: Props) => {
  const coin = coins.find((c) => c.id === selected) ?? coins[0];
  const ORDER = ["brent", "gold", "usdt-rub"];
  const markets = ORDER.map((id) => coins.find((c) => c.id === id)).filter((c): c is Coin => !!c);
  const listed = coins.filter((c) => c.listing);
  const crypto = coins.filter((c) => !c.listing && !ORDER.includes(c.id));
  return (
    <div className="space-y-4">
      <Message author="Traderka Бот" time="Обновляется каждую минуту" icon="CandlestickChart" bot>
        <p className="mb-3 text-muted-foreground">
          {live
            ? "Котировки подтягиваются с биржевых агрегаторов в реальном времени. Нажмите на монету в таблице — график переключится."
            : "Источник котировок сейчас недоступен — показываем последние сохранённые данные. Обновим автоматически."}
        </p>
      </Message>
      <ListingSoon />
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="min-w-0">{coin && <PriceChart key={coin.id} coin={coin} />}</div>
        <div className="space-y-4 min-w-0">
          <StakingCard />
          <PremarketCard />
        </div>
      </div>
      {markets.length > 0 && (
        <QuotesTable coins={markets} selected={selected} onSelect={onSelect} title="Нефть, золото и валюта" icon="Gem" hideCap hideSearch />
      )}
      {listed.length > 0 && (
        <QuotesTable coins={listed} selected={selected} onSelect={onSelect} title="Новые монеты TRADERKA" icon="Rocket" hideCap hideSearch compact />
      )}
      <QuotesTable coins={crypto} selected={selected} onSelect={onSelect} title="Криптовалюты" icon="Coins" />
    </div>
  );
};

export default MarketChannel;
