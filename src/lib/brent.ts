import { useQuery } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";

export interface Brent {
  price: number;
  change: number;
  updatedAt: number;
}

export const useBrent = () =>
  useQuery({
    queryKey: ["brent"],
    queryFn: async () => {
      const r = await fetch(`${func2url.news}?resource=brent`);
      if (!r.ok) throw new Error("Котировка Brent недоступна");
      return (await r.json()) as Brent;
    },
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
