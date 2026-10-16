import { Coin } from "@/lib/crypto";
import PriceChart from "../PriceChart";
import QuotesTable from "../QuotesTable";
import Message from "../Message";

interface Props {
  coins: Coin[];
  selected: string;
  onSelect: (id: string) => void;
  favs: string[];
  toggleFav: (id: string) => void;
  live: boolean;
}

const MarketChannel = ({ coins, selected, onSelect, favs, toggleFav, live }: Props) => {
  const coin = coins.find((c) => c.id === selected) ?? coins[0];
  return (
    <div className="space-y-4">
      <Message author="Traderka Бот" time="Обновляется каждую минуту" icon="CandlestickChart" bot>
        <p className="mb-3 text-muted-foreground">
          {live
            ? "Котировки подтягиваются с биржевых агрегаторов в реальном времени. Нажмите на монету в таблице — график переключится."
            : "Источник котировок сейчас недоступен — показываем последние сохранённые данные. Обновим автоматически."}
        </p>
      </Message>
      {coin && <PriceChart key={coin.id} coin={coin} />}
      <QuotesTable coins={coins} selected={selected} onSelect={onSelect} favs={favs} toggleFav={toggleFav} />
    </div>
  );
};

export default MarketChannel;
