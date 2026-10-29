import Icon from "@/components/ui/icon";
import { CONTACT_FIELDS, contactHref } from "@/lib/contacts";

const ContactLinks = ({ contacts, className = "" }: { contacts?: Record<string, string>; className?: string }) => {
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
          className="inline-flex items-center gap-1.5 rounded-full bg-rail hover:bg-hover border border-border hover:border-primary/60 text-foreground hover:text-white px-3 py-1.5 text-xs transition-colors"
        >
          <Icon name={f.icon} fallback="Link" size={14} className="text-primary" />
          {f.label}
        </a>
      ))}
    </div>
  );
};

export default ContactLinks;
