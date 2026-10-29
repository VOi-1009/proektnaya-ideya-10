import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useDonate } from "@/lib/donate";
import DonateClaim from "./DonateClaim";

const DonateButton = ({ className = "", full = false, menu = false, label }: { className?: string; full?: boolean; menu?: boolean; label?: string }) => {
  const { data } = useDonate();
  const [open, setOpen] = useState(false);
  if (!data?.enabled || (!data.url && !data.details)) return null;

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast({ title: "Скопировано" });
  };

  return (
    <>
      {menu ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors text-muted-foreground hover:text-foreground hover:bg-hover/60"
        >
          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mx-1" />
          <span className="text-[14px]">{label || data.buttonText}</span>
        </button>
      ) : (
      <Button
        onClick={() => setOpen(true)}
        className={`font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/30 hover:text-emerald-100 ${full ? "justify-start" : "h-8 px-2.5 text-[13px]"} ${className}`}
      >
        <Icon name="Heart" size={full ? 16 : 14} className={full ? "mr-2" : "mr-1.5"} />
        {data.buttonText}
      </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-400/15 text-emerald-300 flex items-center justify-center">
                <Icon name="HeartHandshake" size={18} />
              </span>
              {data.title || data.buttonText}
            </DialogTitle>
            {data.text && <DialogDescription className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line pt-1">{data.text}</DialogDescription>}
          </DialogHeader>

          {data.url && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={data.url} size={200} level="M" />
              </div>
              <p className="text-xs text-muted-foreground text-center">Наведите камеру телефона на QR-код — откроется перевод через СБП</p>
              <div className="flex gap-2 w-full">
                <Button asChild className="flex-1 font-semibold bg-emerald-500 hover:bg-emerald-400 text-white">
                  <a href={data.url} target="_blank" rel="noopener noreferrer">
                    <Icon name="Smartphone" size={16} className="mr-2" />
                    Перевести
                  </a>
                </Button>
                <Button variant="outline" onClick={() => copy(data.url)} className="bg-transparent border-input hover:bg-hover hover:text-white" title="Скопировать ссылку">
                  <Icon name="Copy" size={16} />
                </Button>
              </div>
            </div>
          )}

          {data.details && (
            <div className="bg-rail rounded-lg p-3 flex items-start gap-2">
              <p className="text-sm text-foreground whitespace-pre-line flex-1 font-mono">{data.details}</p>
              <button onClick={() => copy(data.details)} className="text-muted-foreground hover:text-white" title="Скопировать реквизиты">
                <Icon name="Copy" size={15} />
              </button>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <DonateClaim open={open} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DonateButton;
