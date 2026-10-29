import { useEffect, useState } from "react";

export type Lang = "ru" | "en";

const KEY = "site-lang";
const listeners = new Set<(l: Lang) => void>();

export const setLang = (l: Lang) => {
  localStorage.setItem(KEY, l);
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn(l));
};

export const useLang = () => {
  const [lang, setState] = useState<Lang>("ru");

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

  return [lang, setLang] as const;
};
