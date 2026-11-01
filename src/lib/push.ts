import { useCallback, useEffect, useState } from "react";
import { PROFILE_URL, useAuth } from "@/lib/auth";

const URL_BASE = `${PROFILE_URL}?resource=push`;

export const pushRequest = async <T,>(token: string | null, query = "", body?: object): Promise<T> => {
  const r = await fetch(`${URL_BASE}${query}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export interface PushStats {
  settings: { enabled: boolean; daily: boolean; digest: boolean };
  subscribers: number;
  withAccount: number;
  sent: number;
  pending: number;
  failed: number;
  messages: { id: number; title: string; body: string; url: string; postId: number | null; createdAt: string; sent: number; pending: number; failed: number }[];
}

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export type PushState = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export const usePush = () => {
  const { token } = useAuth();
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  const detect = useCallback(async () => {
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setState(ios && !standalone ? "ios-install" : "unsupported");
    }
    if (Notification.permission === "denied") return setState("denied");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    } catch {
      setState("unsupported");
    }
  }, []);

  useEffect(() => {
    detect();
  }, [detect]);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return false;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const { publicKey } = await pushRequest<{ publicKey: string }>(null, "&key=1");
      const old = await reg.pushManager.getSubscription();
      const sub = old ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
      const j = sub.toJSON();
      await pushRequest(token, "", { action: "subscribe", endpoint: j.endpoint, keys: j.keys });
      setState("on");
      return true;
    } catch {
      setState("off");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await pushRequest(token, "", { action: "unsubscribe", endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  return { state, busy, enable, disable };
};
