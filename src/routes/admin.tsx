import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/Admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Админ-панель — TRADERKA.RU" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Admin,
});
