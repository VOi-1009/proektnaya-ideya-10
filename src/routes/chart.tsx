import { createFileRoute } from "@tanstack/react-router";
import ChartPage from "@/pages/ChartPage";

export const Route = createFileRoute("/chart")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ coin: typeof s.coin === "string" && s.coin ? s.coin : "x-tka" }),
  head: () => ({ meta: [{ title: "График" }, { name: "robots", content: "noindex" }] }),
  component: () => {
    const { coin } = Route.useSearch();
    return <ChartPage coinId={coin} />;
  },
});
