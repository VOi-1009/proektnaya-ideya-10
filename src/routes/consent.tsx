import { createFileRoute } from "@tanstack/react-router";
import Consent from "@/pages/Consent";

export const Route = createFileRoute("/consent")({
  head: () => ({ meta: [{ title: "Согласие на обработку персональных данных — TRADERKA.RU" }] }),
  component: Consent,
});
