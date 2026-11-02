import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { seoByChannel, seoHead } from "@/lib/seoPages";

const page = seoByChannel("tournaments")!;

export const Route = createFileRoute("/tournaments")({
  head: () => seoHead(page),
  component: () => <Index initialChannel="tournaments" />,
});
