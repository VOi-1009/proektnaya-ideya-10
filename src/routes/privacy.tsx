import { createFileRoute } from "@tanstack/react-router";
import Privacy from "@/pages/Privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Политика обработки персональных данных — TRADERKA.RU" }] }),
  component: Privacy,
});
