import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { seoByChannel, seoHead } from "@/lib/seoPages";

const page = seoByChannel("converter")!;

export const Route = createFileRoute("/converter")({
  head: () => seoHead(page),
  component: () => <Index initialChannel="converter" />,
});
