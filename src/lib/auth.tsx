import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import func2url from "../../backend/func2url.json";

export const AUTH_URL = func2url.auth;
export const PORTFOLIO_URL = func2url.portfolio;
export const PROFILE_URL = func2url.profile;
export const YANDEX_URL = func2url["yandex-auth-yandex-auth"];
const TOKEN_KEY = "svecha-token";
const YANDEX_STATE_KEY = "traderka-yandex-state";

export interface User {
  id: number;
  email: string;
  name?: string;
  avatar?: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  ready: boolean;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
  auth: (action: "login" | "register", email: string, password: string) => Promise<void>;
  loginWithYandex: () => Promise<void>;
  finishYandex: (code: string, state: string | null) => Promise<void>;
  logout: () => Promise<void>;
  patchUser: (u: Partial<User>) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setReady(true);
      return;
    }
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

  const auth = useCallback(async (action: "login" | "register", email: string, password: string) => {
    const r = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error ?? "Не удалось войти, попробуйте ещё раз");
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const loginWithYandex = useCallback(async () => {
    const r = await fetch(`${YANDEX_URL}?action=auth-url`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.auth_url) throw new Error("Вход через Яндекс пока не настроен");
    sessionStorage.setItem(YANDEX_STATE_KEY, data.state ?? "");
    window.location.href = data.auth_url;
  }, []);

  const finishYandex = useCallback(async (code: string, state: string | null) => {
    const expected = sessionStorage.getItem(YANDEX_STATE_KEY);
    sessionStorage.removeItem(YANDEX_STATE_KEY);
    if (expected && state !== expected) throw new Error("Сессия входа устарела, попробуйте ещё раз");
    const r = await fetch(`${YANDEX_URL}?action=callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.session_token) throw new Error("Не удалось войти через Яндекс");
    localStorage.setItem(TOKEN_KEY, data.session_token);
    setToken(data.session_token);
    setUser({ id: data.user.id, email: data.user.email || data.user.name || "Яндекс ID" });
  }, []);

  const logout = useCallback(async () => {
    const t = token;
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
    <Ctx.Provider value={{ user, token, ready, authOpen, setAuthOpen, auth, loginWithYandex, finishYandex, logout, patchUser }}>{children}</Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};