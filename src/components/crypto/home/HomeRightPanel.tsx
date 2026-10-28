import { SideBlocks } from "@/components/crypto/HomeBlocks";
import SidePolls from "@/components/crypto/SidePolls";
import HeroSiteNews from "@/components/crypto/HeroSiteNews";

const HomeRightPanel = () => {
  return (
    <aside className="hidden xl:block w-64 bg-card p-3 flex-shrink-0 space-y-5">
      <div className="rounded-lg border border-border bg-rail/40 overflow-hidden">
        <HeroSiteNews />
      </div>
      <SidePolls />
      <SideBlocks />
    </aside>
  );
};

export default HomeRightPanel;