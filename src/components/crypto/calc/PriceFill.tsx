import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coin, COIN_META, fmtPrice, isFx } from "@/lib/crypto";

const toInput = (p: number) => {
  const s = p.toFixed(p >= 1000 ? 2 : p >= 1 ? 4 : 8);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
};

interface Props {
  coins: Coin[];
  onFill: (value: string) => void;
}

const PriceFill = ({ coins, onFill }: Props) => {
  const [coinId, setCoinId] = useState("bitcoin");
  const list = coins.filter((c) => !isFx(c.id));
  const price = coins.find((c) => c.id === coinId)?.current_price ?? 0;
  const short = COIN_META[coinId]?.short ?? coinId;

  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      <Select value={coinId} onValueChange={setCoinId}>
        <SelectTrigger className="h-8 w-[112px] bg-rail border-0 text-xs font-coin flex-shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {list.map((c) => (
            <SelectItem key={c.id} value={c.id} className="font-coin">
              {COIN_META[c.id]?.short ?? c.symbol.toUpperCase()} · {COIN_META[c.id]?.ru ?? c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!price}
        onClick={(e) => {
          e.preventDefault();
          onFill(toInput(price));
        }}
        title={price ? `${short}: ${fmtPrice(price, coinId)}` : "Курс ещё загружается"}
        className="h-8 px-2.5 text-xs min-w-0"
      >
        <Icon name="Crosshair" size={13} className="mr-1 flex-shrink-0" />
        <span className="truncate">Подставить текущий курс</span>
      </Button>
    </div>
  );
};

export default PriceFill;
