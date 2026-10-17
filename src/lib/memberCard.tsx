import { createContext, ReactNode, useContext, useState } from "react";
import MemberCard from "@/components/crypto/MemberCard";

const Ctx = createContext<(id: number) => void>(() => {});

export const MemberCardProvider = ({ children }: { children: ReactNode }) => {
  const [id, setId] = useState<number | null>(null);
  return (
    <Ctx.Provider value={setId}>
      {children}
      <MemberCard id={id} onClose={() => setId(null)} />
    </Ctx.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useOpenMember = () => useContext(Ctx);
