import { useEffect, useRef, useState } from "react";
import { PROFILE_URL, useAuth } from "@/lib/auth";

export type Lang = "ru" | "en";

const KEY = "site-lang";
const listeners = new Set<(l: Lang) => void>();

export const setLang = (l: Lang) => {
  localStorage.setItem(KEY, l);
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn(l));
};

const save = (token: string, l: Lang) =>
  fetch(`${PROFILE_URL}?resource=prefs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": token },
    body: JSON.stringify({ key: "lang", value: l }),
  }).catch(() => undefined);

export const useLang = () => {
  const [lang, setState] = useState<Lang>("ru");
  const { token, user, ready } = useAuth();
  const synced = useRef("");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "ru" || saved === "en") {
      setState(saved);
      document.documentElement.lang = saved;
    }
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  useEffect(() => {
    if (!ready || !user || !token || synced.current === token) return;
    synced.current = token;
    fetch(`${PROFILE_URL}?resource=prefs`, { headers: { "X-Auth-Token": token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const remote = d?.prefs?.lang;
        if (remote === "ru" || remote === "en") {
          if (remote !== localStorage.getItem(KEY)) setLang(remote);
        } else {
          const own = localStorage.getItem(KEY);
          if (own === "ru" || own === "en") save(token, own);
        }
      })
      .catch(() => undefined);
  }, [ready, user?.id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (l: Lang) => {
    setLang(l);
    if (token) save(token, l);
  };

  return [lang, change] as const;
};
