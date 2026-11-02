import { useQuery } from "@tanstack/react-query";
import { fundRequest } from "@/lib/fund";

export interface ListingItem {
  id: number;
  slug: string;
  symbol: string;
  name: string;
  description: string;
  color: string;
  iconUrl: string;
  status: "draft" | "scheduled" | "trading" | "halted" | "delisted";
  statusRu: string;
  listingAt: string;
  startPrice: number;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  totalSupply: number;
  volatility: number;
  drift: number;
  liquidity: number;
  spreadPct: number;
  tickSize: number;
  maxLeverage: number;
  minLevel: number;
  allowShort: boolean;
  minMargin: number;
  maxMargin: number;
  feePercent: number;
  anchorCoin: string;
  anchorBeta: number;
  halted: boolean;
  sort: number;
}

export interface BookData {
  bids: number[][];
  asks: number[][];
  bestBid: number;
  bestAsk: number;
  mid: number;
  trades: { side: string; price: number; qty: number; at: string }[];
}

export const useListings = () =>
  useQuery<{ items: ListingItem[] }>({
    queryKey: ["listings"],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: () => fundRequest(null, "?action=listings"),
  });

export const useListingBook = (slug: string | null) =>
  useQuery<BookData>({
    queryKey: ["listing-book", slug],
    enabled: !!slug,
    staleTime: 3_000,
    refetchInterval: 8_000,
    queryFn: () => fundRequest(null, `?action=listing_book&slug=${slug}`),
  });

export const untilText = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "вот-вот";
  const d = Math.floor(ms / 86400_000);
  const h = Math.floor((ms % 86400_000) / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (d > 0) return `${d} дн. ${h} ч`;
  if (h > 0) return `${h} ч ${m} мин`;
  return `${Math.max(1, m)} мин`;
};
