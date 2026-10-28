import { SideBlocks } from "@/components/crypto/HomeBlocks";
import SidePolls from "@/components/crypto/SidePolls";
import ProfileMiniCard from "./ProfileMiniCard";

const HomeRightPanel = () => {
  return (
    <aside className="hidden xl:block w-64 bg-card p-3 flex-shrink-0 space-y-5">
      <ProfileMiniCard part="achievements" />
      <SidePolls />
      <SideBlocks />
    </aside>
  );
};

export default HomeRightPanel;