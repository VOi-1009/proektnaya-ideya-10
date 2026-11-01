import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { seoByChannel, seoHead } from "@/lib/seoPages";

const page = seoByChannel("shop")!;

export const Route = createFileRoute("/shop")({
  head: () => seoHead(page),
  component: () => <Index initialChannel="shop" />,
});
