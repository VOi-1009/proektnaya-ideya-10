import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { seoByChannel, seoHead } from "@/lib/seoPages";

const page = seoByChannel("market")!;

export const Route = createFileRoute("/market")({
  head: () => seoHead(page),
  component: () => <Index initialChannel="market" />,
});
