import { createFileRoute } from "@tanstack/react-router";
import { TRADING_URL } from "@/lib/tka";

export const Route = createFileRoute("/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        let appIcon = "";
        let app = { name: "TRADERKA — крипто сообщество", shortName: "TRADERKA", color: "#1f2024", accent: "#F97316" };
        try {
          const r = await fetch(`${TRADING_URL}?action=mobile_settings`);
          if (r.ok) {
            const d = (await r.json()) as { settings?: { app?: typeof app } };
            if (d.settings?.app) app = { ...app, ...d.settings.app };
          }
          const g = await fetch(`${TRADING_URL}?action=graphics_settings`);
          if (g.ok) appIcon = ((await g.json()) as { settings?: { appIcon?: string } }).settings?.appIcon ?? "";
        } catch {
          app = { ...app };
        }
        const manifest = {
          name: app.name,
          short_name: app.shortName,
          description: "Котировки, новости, биржа и игры TRADERKA.RU",
          lang: "ru",
          start_url: "/m?source=app",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: app.color,
          theme_color: app.color,
          icons: appIcon
            ? [
                { src: appIcon, sizes: "192x192", purpose: "any" },
                { src: appIcon, sizes: "512x512", purpose: "any" },
                { src: appIcon, sizes: "512x512", purpose: "maskable" },
              ]
            : [
                { src: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                { src: "/app-icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
              ],
        };
        return new Response(JSON.stringify(manifest), {
          headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=300" },
        });
      },
    },
  },
});
