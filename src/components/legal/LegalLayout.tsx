import { ReactNode } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";

const LegalLayout = ({ title, updated, children }: { title: string; updated: string; children: ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground font-body">
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white mb-4">
        <Icon name="ArrowLeft" size={14} />
        На сайт
      </Link>
      <h1 className="font-display text-2xl text-white mb-1">{title}</h1>
      <p className="text-xs text-muted-foreground mb-6">Редакция от {updated}</p>
      <div className="space-y-6 text-sm leading-relaxed text-foreground [&_h2]:text-white [&_h2]:font-semibold [&_h2]:text-base [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a:hover]:underline">
        {children}
      </div>
    </div>
  </div>
);

export default LegalLayout;
