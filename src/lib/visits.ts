import { useEffect } from "react";
import { useLocation } from "@/lib/router-compat";
import { PROFILE_URL, useAuth } from "@/lib/auth";

const VID_KEY = "traderka-vid";

const visitorId = () => {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).slice(0, 40);
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch {
    return "";
  }
};

export const visitsRequest = async <T,>(token: string | null, query = ""): Promise<T> => {
  const r = await fetch(`${PROFILE_URL}?resource=visits${query}`, {
    headers: token ? { "X-Auth-Token": token } : {},
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

export const useTrackVisit = () => {
  const { pathname } = useLocation();
  const { token, ready } = useAuth();

  useEffect(() => {
    if (!ready || pathname.startsWith("/admin") || pathname.startsWith("/auth")) return;
    const vid = visitorId();
    if (!vid) return;
    const t = setTimeout(() => {
      fetch(`${PROFILE_URL}?resource=visits`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
        body: JSON.stringify({
          vid,
          path: pathname,
          ref: document.referrer,
          mobile: window.matchMedia("(max-width: 768px)").matches,
        }),
      }).catch(() => undefined);
    }, 1500);
    return () => clearTimeout(t);
  }, [pathname, ready]); // eslint-disable-line react-hooks/exhaustive-deps
};

export const useActiveTime = () => {
  const { token } = useAuth();
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetch(`${PROFILE_URL}?resource=visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token },
        body: JSON.stringify({ beat: true }),
      }).catch(() => undefined);
    }, 60000);
    return () => clearInterval(id);
  }, [token]);
};

export const VisitTracker = () => {
  useTrackVisit();
  useActiveTime();
  return null;
};
