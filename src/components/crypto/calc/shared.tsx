import { ReactNode } from "react";
import Icon from "@/components/ui/icon";
import { Coin } from "@/lib/crypto";

export const num = (s: string) => parseFloat(s.replace(/\s/g, "").replace(",", "."));

export const fmt = (v: number, max = 4) =>
  Number.isFinite(v) ? v.toLocaleString("ru-RU", { maximumFractionDigits: Math.abs(v) >= 1000 ? 2 : Math.abs(v) >= 1 ? max : 8 }) : "—";

export const fmtSigned = (v: number, suffix = "") => (Number.isFinite(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt(Math.abs(v), 2)}${suffix}` : "—");

export const tone = (v: number) => (v > 0 ? "text-up" : v < 0 ? "text-down" : "text-white");

export interface CalcProps {
  coins: Coin[];
}

export const inputCls =
  "w-full bg-rail rounded px-3 h-9 font-mono text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground placeholder:font-body";

export const Field = ({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) => (
  <label className={`space-y-1 block min-w-0 ${className}`}>
    <span className="text-xs text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="block text-[10px] text-muted-foreground/70">{hint}</span>}
  </label>
);

export const NumInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" placeholder={placeholder} className={inputCls} />
);

export const Panel = ({ children }: { children: ReactNode }) => <div className="space-y-2">{children}</div>;

export const ToolCard = ({ title, icon, children }: { title: string; icon: string; children: ReactNode }) => (
  <section className="bg-card border border-border rounded-lg p-3 mb-3 break-inside-avoid">
    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white mb-2">
      <Icon name={icon} size={15} fallback="Calculator" className="text-primary" />
      {title}
    </h3>
    {children}
  </section>
);

export const Result = ({ label, value, cls = "text-white", sub }: { label: string; value: string; cls?: string; sub?: string }) => (
  <div className="bg-rail rounded px-2.5 py-1.5 min-w-0">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className={`font-mono text-sm truncate ${cls}`}>{value}</div>
    {sub && <div className="text-[10px] text-muted-foreground font-mono truncate">{sub}</div>}
  </div>
);

export const Segment = <T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) => (
  <div className="flex bg-rail rounded p-0.5 w-fit">
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        onClick={() => onChange(o.id)}
        className={`px-2.5 py-1 text-xs rounded transition-colors ${value === o.id ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-white"}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const Note = ({ children }: { children: ReactNode }) => <p className="text-[11px] text-muted-foreground leading-snug">{children}</p>;
