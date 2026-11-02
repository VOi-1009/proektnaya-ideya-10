import { useQuery } from "@tanstack/react-query";
import { fundRequest } from "@/lib/fund";

export interface ReferralInfo {
  enabled: boolean;
  rewardTka: number;
  rewardUsdt: number;
  fundTka: number;
  friendBonusTka: number;
  trigger: "register" | "first_action";
  title: string;
  text: string;
}

export interface ReferralMe {
  settings: ReferralInfo & { maxPerUser: number };
  code: string;
  invited: number;
  paid: number;
  earnedTka: number;
  earnedUsdt: number;
  left: number | null;
  friends: { status: string; source: string; at: string; reward: number; name: string }[];
}

export const REF_KEY = "ref-code";

export const useReferralInfo = () =>
  useQuery<ReferralInfo>({
    queryKey: ["referral-info"],
    staleTime: 5 * 60_000,
    queryFn: () => fundRequest(null, "?action=referral_info"),
  });

export const useReferralMe = (token: string | null) =>
  useQuery<ReferralMe>({
    queryKey: ["referral-me", token],
    enabled: !!token,
    staleTime: 30_000,
    queryFn: () => fundRequest(token, "?action=referral_me"),
  });

export const readRefCode = () => {
  try {
    return localStorage.getItem(REF_KEY) || "";
  } catch {
    return "";
  }
};

export const saveRefCode = (code: string) => {
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 24);
  if (!clean) return;
  try {
    localStorage.setItem(REF_KEY, clean);
  } catch {
    return;
  }
};

export const clearRefCode = () => {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    return;
  }
};

export const refLink = (code: string, path = "/") => `https://traderka.ru${path}${path.includes("?") ? "&" : "?"}ref=${code}`;
