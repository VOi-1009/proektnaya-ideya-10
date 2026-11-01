import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { seoByChannel, seoHead } from "@/lib/seoPages";

const page = seoByChannel("news")!;

export const Route = createFileRoute("/news")({
  head: () => seoHead(page),
  component: () => <Index initialChannel="news" />,
});
