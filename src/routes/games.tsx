import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { seoByChannel, seoHead } from "@/lib/seoPages";

const page = seoByChannel("games")!;

export const Route = createFileRoute("/games")({
  head: () => seoHead(page),
  component: () => <Index initialChannel="games" />,
});
