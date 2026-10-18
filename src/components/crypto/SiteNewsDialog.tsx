import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { SiteNews } from "@/lib/siteNews";

interface Props {
  item: SiteNews | null;
  onClose: () => void;
}

const SiteNewsDialog = ({ item, onClose }: Props) => (
  <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      {item && (
        <>
          <DialogHeader>
            <DialogTitle className="text-sky-400 leading-snug">{item.title}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {new Date(item.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
            </DialogDescription>
          </DialogHeader>
          {item.body && <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{item.body}</p>}
        </>
      )}
    </DialogContent>
  </Dialog>
);

export default SiteNewsDialog;
