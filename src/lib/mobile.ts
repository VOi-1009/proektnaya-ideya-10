import { useEffect } from "react";
import { useMobileSettings } from "@/lib/fund";

const KEY = "view-mode";

export const chooseDesktop = () => {
  try {
    localStorage.setItem(KEY, "desktop");
  } catch {
    return;
  }
};

export const chooseMobile = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    return;
  }
};

const isPhone = () => /Android.+Mobile|iPhone|iPod|Windows Phone|Mobile Safari/i.test(navigator.userAgent) && window.innerWidth < 820;

export const useMobileRedirect = () => {
  const { data } = useMobileSettings();
  const on = !!data?.settings.enabled && !!data?.settings.redirect;
  useEffect(() => {
    if (!on) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("full") === "1") {
      chooseDesktop();
      return;
    }
    let desktop = false;
    try {
      desktop = localStorage.getItem(KEY) === "desktop";
    } catch {
      desktop = false;
    }
    if (desktop || q.has("c") || q.has("article") || !isPhone()) return;
    window.location.replace("/m");
  }, [on]);
};
