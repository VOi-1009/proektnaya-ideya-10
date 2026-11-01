import { createFileRoute } from "@tanstack/react-router";
import MobileApp from "@/components/mobile/MobileApp";

export const Route = createFileRoute("/m")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "TRADERKA — мобильная версия" },
      { name: "description", content: "Лёгкая мобильная версия TRADERKA.RU: котировки, новости, игры и профиль." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
    links: [{ rel: "canonical", href: "https://traderka.ru/m" }],
  }),
  component: MobileApp,
});
