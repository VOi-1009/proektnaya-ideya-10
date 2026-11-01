import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import func2url from "../../backend/func2url.json";

export const AUTH_URL = func2url.auth;
export const PORTFOLIO_URL = func2url.portfolio;
export const PROFILE_URL = func2url.profile;
const TOKEN_KEY = "svecha-token";

export interface User {
  id: number;
  email: string;
  name?: string;
  avatar?: string;
  isAdmin?: boolean;
  level?: number;
  statusTitle?: string;
  founder?: number | null;
  supporter?: number | null;
  creator?: boolean;
  tier?: number;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  ready: boolean;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
  auth: (action: "login" | "register", email: string, password: string, team?: string) => Promise<void>;
  logout: () => Promise<void>;
  patchUser: (u: Partial<User>) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }
    setToken(token);
    fetch(AUTH_URL, { headers: { "X-Auth-Token": token } })
      .then(async (r) => {
        if (r.ok) setUser((await r.json()).user);
        else if (r.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const auth = useCallback(async (action: "login" | "register", email: string, password: string, team?: string) => {
    const r = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email, password, team }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error ?? "Не удалось войти, попробуйте ещё раз");
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const t = token;
    if (t && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await fetch(`${PROFILE_URL}?resource=push`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Auth-Token": t },
            body: JSON.stringify({ action: "unlink", endpoint: sub.endpoint }),
          });
        }
      } catch {
        /* отвязка не критична */
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    if (t) {
      await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": t },
        body: JSON.stringify({ action: "logout" }),
      }).catch(() => undefined);
    }
  }, [token]);

  const patchUser = useCallback((u: Partial<User>) => setUser((p) => (p ? { ...p, ...u } : p)), []);

  return (
    <Ctx.Provider value={{ user, token, ready, authOpen, setAuthOpen, auth, logout, patchUser }}>{children}</Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};