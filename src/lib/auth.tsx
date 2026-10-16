import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import func2url from "../../backend/func2url.json";

export const AUTH_URL = func2url.auth;
export const PORTFOLIO_URL = func2url.portfolio;
const TOKEN_KEY = "svecha-token";

export interface User {
  id: number;
  email: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  ready: boolean;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
  auth: (action: "login" | "register", email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

  return (
    <Ctx.Provider value={{ user, token, ready, authOpen, setAuthOpen, auth, logout }}>{children}</Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
