import { createFileRoute } from "@tanstack/react-router";
import Rating from "@/pages/Rating";

const TITLE = "Рейтинг трейдеров и участников сообщества | TRADERKA.RU";
const DESC =
  "Топ-50 участников крипто сообщества по очкам активности: статусы, достижения и бонусы. Бесплатно присоединяйтесь и поднимайтесь в рейтинге.";

export const Route = createFileRoute("/rating")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://traderka.ru/rating" }],
  }),
  component: Rating,
});
