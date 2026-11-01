import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fundRequest } from "@/lib/fund";
import { QUICK_EMOJI } from "@/lib/community";

export interface GraphicsSettings {
  logo: string;
  favicon: string;
  appIcon: string;
  emoji: string[];
}

export const useGraphics = () =>
  useQuery<GraphicsSettings>({
    queryKey: ["graphics-settings"],
    staleTime: 5 * 60_000,
    queryFn: async () => (await fundRequest<{ settings: GraphicsSettings }>(null, "?action=graphics_settings")).settings,
  });

export const useEmojiList = () => {
  const { data } = useGraphics();
  return data?.emoji?.length ? data.emoji : QUICK_EMOJI;
};

export const useFaviconSync = () => {
  const { data } = useGraphics();
  useEffect(() => {
    if (!data?.favicon) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.removeAttribute("type");
    link.href = data.favicon;
  }, [data?.favicon]);
};
