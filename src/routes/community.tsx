import { createFileRoute } from "@tanstack/react-router";
import Community from "@/pages/Community";

const TITLE = "Крипто сообщество трейдеров — лента идей и мнений | TRADERKA.RU";
const DESC =
  "Бесплатная соцсеть для трейдеров: пишите посты о рынке, отмечайте монеты и бычий или медвежий настрой, ставьте реакции, подписывайтесь на авторов и растите в рейтинге.";

export const Route = createFileRoute("/community")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://traderka.ru/community" }],
  }),
  component: Community,
});
