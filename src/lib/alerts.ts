import { useCallback, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Coin, COIN_META, fmtPrice } from "@/lib/crypto";
import { usePref } from "@/lib/prefs";

export interface PriceAlert {
  id: string;
  coinId: string;
  target: number;
  direction: "above" | "below";
  createdAt: number;
  createdPrice: number;
  triggeredAt?: number;
  triggeredPrice?: number;
}

const KEY = "traderka-alerts";

const beep = () => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.start(t);
      o.stop(t + 0.17);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* звук недоступен */
  }
};

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

export function usePriceAlerts(coins: Coin[], live: boolean) {
  const [alerts, setAlerts] = usePref<PriceAlert[]>("alerts", [], {
    legacyKey: KEY,
    parse: (v) => (Array.isArray(v) ? (v as PriceAlert[]).slice(0, 100) : []),
  });
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  useEffect(() => {
    if (!live || !coins.length) return;
    const fired: PriceAlert[] = [];
    const next = alertsRef.current.map((a) => {
      if (a.triggeredAt) return a;
      const price = coins.find((c) => c.id === a.coinId)?.current_price;
      if (!price) return a;
      const hit = a.direction === "above" ? price >= a.target : price <= a.target;
      if (!hit) return a;
      const done = { ...a, triggeredAt: Date.now(), triggeredPrice: price };
      fired.push(done);
      return done;
    });
    if (!fired.length) return;
    setAlerts(next);
    beep();
    fired.forEach((a) => {
      const name = COIN_META[a.coinId]?.ru ?? a.coinId;
      const verb = a.direction === "above" ? "поднялся до" : "опустился до";
      const text = `${name} ${verb} ${fmtPrice(a.target, a.coinId)} — сейчас ${fmtPrice(a.triggeredPrice!, a.coinId)}`;
      toast({ title: "🔔 Цель достигнута", description: text, duration: 15000 });
      if (notificationsSupported() && Notification.permission === "granted" && document.hidden) {
        new Notification("TRADERKA.RU — цель достигнута", { body: text, tag: a.id });
      }
    });
  }, [coins, live]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback((coinId: string, target: number, currentPrice: number) => {
    const a: PriceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      coinId,
      target,
      direction: target >= currentPrice ? "above" : "below",
      createdAt: Date.now(),
      createdPrice: currentPrice,
    };
    setAlerts((list) => [a, ...list].slice(0, 100));
    return a;
  }, [setAlerts]);

  const remove = useCallback((id: string) => setAlerts((list) => list.filter((a) => a.id !== id)), [setAlerts]);
  const clearTriggered = useCallback(() => setAlerts((list) => list.filter((a) => !a.triggeredAt)), [setAlerts]);

  return { alerts, add, remove, clearTriggered };
}

export type PriceAlertsApi = ReturnType<typeof usePriceAlerts>;