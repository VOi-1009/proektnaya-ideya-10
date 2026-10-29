export interface ContactField {
  key: string;
  label: string;
  icon: string;
  placeholder: string;
}

export const CONTACT_FIELDS: ContactField[] = [
  { key: "telegram", label: "Telegram", icon: "Send", placeholder: "@username" },
  { key: "whatsapp", label: "WhatsApp", icon: "MessageCircle", placeholder: "+7 900 000-00-00" },
  { key: "vk", label: "ВКонтакте", icon: "Users", placeholder: "vk.com/id или ссылка" },
  { key: "youtube", label: "YouTube", icon: "Youtube", placeholder: "Ссылка на канал" },
  { key: "instagram", label: "Instagram", icon: "Instagram", placeholder: "@username" },
  { key: "x", label: "X (Twitter)", icon: "Twitter", placeholder: "@username" },
  { key: "tiktok", label: "TikTok", icon: "Music2", placeholder: "@username" },
  { key: "site", label: "Сайт", icon: "Globe", placeholder: "https://example.com" },
  { key: "publicEmail", label: "Почта для связи", icon: "Mail", placeholder: "name@example.com" },
  { key: "phone", label: "Телефон", icon: "Phone", placeholder: "+7 900 000-00-00" },
];

export const EXPERIENCE: { value: string; label: string }[] = [
  { value: "", label: "Не указан" },
  { value: "novice", label: "Новичок" },
  { value: "1y", label: "До года" },
  { value: "3y", label: "1–3 года" },
  { value: "5y", label: "3–5 лет" },
  { value: "10y", label: "Более 5 лет" },
];

export const experienceLabel = (v?: string) => EXPERIENCE.find((e) => e.value === v)?.label ?? "";

const handle = (v: string) => v.replace(/^@/, "").replace(/^https?:\/\/[^/]+\//i, "").replace(/\/+$/, "");
const web = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

export const contactHref = (key: string, raw: string): string | null => {
  const v = raw.trim();
  if (!v) return null;
  let url = "";
  if (key === "telegram") url = `https://t.me/${handle(v)}`;
  else if (key === "whatsapp") url = `https://wa.me/${v.replace(/\D/g, "")}`;
  else if (key === "instagram") url = `https://instagram.com/${handle(v)}`;
  else if (key === "x") url = `https://x.com/${handle(v)}`;
  else if (key === "tiktok") url = `https://tiktok.com/@${handle(v)}`;
  else if (key === "vk") url = /^https?:\/\//i.test(v) || v.includes(".") ? web(v) : `https://vk.com/${v}`;
  else if (key === "youtube" || key === "site") url = web(v);
  else if (key === "publicEmail") url = `mailto:${v}`;
  else if (key === "phone") url = `tel:${v.replace(/[^\d+]/g, "")}`;
  else return null;
  return /^(https?:|mailto:|tel:)/i.test(url) ? url : null;
};
