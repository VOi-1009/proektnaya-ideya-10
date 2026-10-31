import { SideBlocks } from "@/components/crypto/HomeBlocks";

const HomeRightPanel = () => {
  return (
    <aside className="hidden xl:block w-64 bg-card p-3 flex-shrink-0 space-y-5">
      <SideBlocks />
    </aside>
  );
};

export default HomeRightPanel;