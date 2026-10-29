import { Lang, useLang } from "@/lib/lang";

const ITEMS: { id: Lang; label: string; title: string }[] = [
  { id: "ru", label: "RU", title: "Русский" },
  { id: "en", label: "EN", title: "English" },
];

const LangSwitch = () => {
  const [lang, setLang] = useLang();
  return (
    <div className="flex items-center gap-0.5 bg-rail rounded-md p-0.5" role="group" aria-label="Язык сайта">
      {ITEMS.map((i) => (
        <button
          key={i.id}
          onClick={() => setLang(i.id)}
          title={i.title}
          aria-pressed={lang === i.id}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
            lang === i.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
          }`}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
};

export default LangSwitch;
