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

export const donateRequest = async <T,>(token: string | null, body?: object): Promise<T> => {
  const r = await fetch(`${PROFILE_URL}?resource=donate`, {
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
