import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { seoByChannel, seoHead } from "@/lib/seoPages";

const page = seoByChannel("rules")!;

export const Route = createFileRoute("/faq")({
  head: () => seoHead(page),
  component: () => <Index initialChannel="rules" />,
});
