import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { seoByChannel, seoHead } from "@/lib/seoPages";

const page = seoByChannel("fund")!;

export const Route = createFileRoute("/fund")({
  head: () => seoHead(page),
  component: () => <Index initialChannel="fund" />,
});
