import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { seoByChannel, seoHead } from "@/lib/seoPages";

const page = seoByChannel("trading")!;

export const Route = createFileRoute("/trading")({
  head: () => seoHead(page),
  component: () => <Index initialChannel="trading" />,
});
