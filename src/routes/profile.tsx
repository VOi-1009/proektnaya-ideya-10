import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/pages/Profile";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Личный кабинет — TRADERKA.RU" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Profile,
});
