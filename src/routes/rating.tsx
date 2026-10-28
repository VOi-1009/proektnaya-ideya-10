import { createFileRoute } from "@tanstack/react-router";
import Rating from "@/pages/Rating";

export const Route = createFileRoute("/rating")({
  component: Rating,
});
