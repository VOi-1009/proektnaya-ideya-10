import Icon from "@/components/ui/icon";
import { CONTACT_FIELDS, contactHref } from "@/lib/contacts";

const ContactLinks = ({ contacts, className = "", compact = false }: { contacts?: Record<string, string>; className?: string; compact?: boolean }) => {
  const items = CONTACT_FIELDS.map((f) => ({ f, href: contacts?.[f.key] ? contactHref(f.key, contacts[f.key]) : null })).filter((x) => x.href);
  if (!items.length) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map(({ f, href }) => (
        <a
          key={f.key}
          href={href!}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title={f.label}
          aria-label={f.label}
          className={`inline-flex items-center gap-1.5 rounded-full bg-rail hover:bg-hover border border-border hover:border-primary/60 text-foreground hover:text-white text-xs transition-colors ${compact ? "w-8 h-8 justify-center" : "px-3 py-1.5"}`}
        >
          <Icon name={f.icon} fallback="Link" size={14} className="text-primary" />
          {!compact && f.label}
        </a>
      ))}
    </div>
  );
};

export default ContactLinks;
