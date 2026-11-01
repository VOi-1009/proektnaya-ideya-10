import { createFileRoute } from "@tanstack/react-router";
import MobileApp from "@/components/mobile/MobileApp";

export const Route = createFileRoute("/m")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "TRADERKA — мобильная версия" },
      { name: "description", content: "Лёгкая мобильная версия TRADERKA.RU: котировки, новости, игры и профиль." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "TRADERKA" },
    ],
    links: [
      { rel: "canonical", href: "https://traderka.ru/m" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/app-icons/apple-touch-icon.png" },
    ],
  }),
  component: MobileApp,
});
