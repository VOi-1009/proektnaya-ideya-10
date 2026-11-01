import { useCallback, useEffect, useRef, useState } from "react";
import { PROFILE_URL, useAuth } from "@/lib/auth";

const URL_BASE = `${PROFILE_URL}?resource=prefs`;

const request = async <T,>(token: string, body?: object): Promise<T> => {
  const r = await fetch(URL_BASE, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Auth-Token": token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Не удалось связаться с сервером");
  return data as T;
};

const readLocal = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(`pref-${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

const writeLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(`pref-${key}`, JSON.stringify(value));
  } catch {
    return;
  }
};

export function usePref<T>(key: string, fallback: T, opts: { legacyKey?: string; parse?: (v: unknown) => T } = {}) {
  const { token, user, ready } = useAuth();
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const fb = useRef(fallback);
  const parse = opts.parse;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const fix = (v: unknown): T => (parse ? parse(v) : (v as T));
    let local = readLocal<unknown>(key, undefined);
    if (local === undefined && opts.legacyKey) {
      try {
        const raw = localStorage.getItem(opts.legacyKey);
        if (raw !== null) local = JSON.parse(raw);
      } catch {
        local = undefined;
      }
    }
    const localVal = local === undefined ? fb.current : fix(local);

    if (!user || !token) {
      setValue(localVal);
      setLoaded(true);
      return;
    }
    request<{ prefs: Record<string, string> }>(token)
      .then(async (d) => {
        if (cancelled) return;
        const remote = d.prefs[key];
        if (remote !== undefined) {
          let parsed: unknown = remote;
          try {
            parsed = JSON.parse(remote);
          } catch {
            parsed = remote;
          }
          const v = fix(parsed);
          setValue(v);
          writeLocal(key, v);
        } else {
          setValue(localVal);
          if (local !== undefined) {
            await request(token, { key, value: JSON.stringify(localVal) }).catch(() => undefined);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setValue(localVal);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user?.id, token, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(
    (next: T | ((cur: T) => T)) => {
      setValue((cur) => {
        const v = typeof next === "function" ? (next as (c: T) => T)(cur) : next;
        writeLocal(key, v);
        const t = tokenRef.current;
        if (t) request(t, { key, value: JSON.stringify(v) }).catch(() => undefined);
        return v;
      });
    },
    [key]
  );

  return [value, save, loaded] as const;
}
