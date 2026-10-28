import { useQuery } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";

export interface CalendarEvent {
  ts: number;
  day: string;
  time: string;
  country: string;
  currency: string;
  title: string;
  forecast: string;
  previous: string;
}

export const useEconCalendar = () =>
  useQuery({
    queryKey: ["econ-calendar"],
    queryFn: async () => {
      const r = await fetch(`${func2url.news}?resource=calendar`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(d.items)) throw new Error(d.error ?? "Календарь временно недоступен");
      return d.items as CalendarEvent[];
    },
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
