import { SideBlocks } from "@/components/crypto/HomeBlocks";
import SidePolls from "@/components/crypto/SidePolls";
import ProfileMiniCard from "./ProfileMiniCard";

interface Props {
  favsCount: number;
}

const HomeRightPanel = ({ favsCount }: Props) => {
  return (
    <aside className="hidden xl:block w-64 bg-card p-3 flex-shrink-0 space-y-5">
      <ProfileMiniCard favsCount={favsCount} />
      <SidePolls />
      <SideBlocks />
    </aside>
  );
};

export default HomeRightPanel;