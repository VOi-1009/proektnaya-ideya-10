import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SideBlocks } from "@/components/crypto/HomeBlocks";
import { useHomeBlocks } from "@/lib/blocks";

const HomeRightDrawer = () => {
  const [open, setOpen] = useState(false);
  const { data } = useHomeBlocks("side");
  const empty = !data?.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Открыть правое меню"
        title="Боковые блоки"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-6 h-14 rounded-l-lg bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:w-8 transition-all"
      >
        <Icon name="ChevronLeft" size={18} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[340px] bg-card border-border p-3 overflow-y-auto">
          <SheetTitle className="sr-only">Боковые блоки</SheetTitle>
          <SheetDescription className="sr-only">Дополнительные блоки сайта</SheetDescription>
          <div className="mt-6">
            {empty ? (
              <p className="text-sm text-muted-foreground text-center py-10">Здесь пока ничего нет</p>
            ) : (
              <SideBlocks />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default HomeRightDrawer;
