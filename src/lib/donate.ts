import { useQuery } from "@tanstack/react-query";
import { PROFILE_URL } from "@/lib/auth";

export interface DonateSettings {
  enabled: boolean;
  buttonText: string;
  title: string;
  text: string;
  url: string;
  details: string;
}

export const donateRequest = async <T,>(token: string | null, body?: object, query = ""): Promise<T> => {
  const r = await fetch(`${PROFILE_URL}?resource=donate${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useDonate = () =>
  useQuery({
    queryKey: ["donate"],
    queryFn: () => donateRequest<{ donate: DonateSettings }>(null).then((d) => d.donate),
    staleTime: 10 * 60_000,
  });

export interface DonationRequest {
  id: number;
  amount: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt: string | null;
  user: { id: number; name: string; avatar: string; supporter: number | null; promo: string };
}

export const useMyDonation = (token: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ["donate-mine", token],
    enabled: enabled && !!token,
    queryFn: () =>
      donateRequest<{ last: { id: number; amount: number; status: DonationRequest["status"]; createdAt: string } | null }>(token, undefined, "&mine=1").then(
        (d) => d.last,
      ),
  });
