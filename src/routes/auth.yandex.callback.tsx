import { createFileRoute } from "@tanstack/react-router";
import YandexCallback from "@/pages/YandexCallback";

export const Route = createFileRoute("/auth/yandex/callback")({
  component: YandexCallback,
});