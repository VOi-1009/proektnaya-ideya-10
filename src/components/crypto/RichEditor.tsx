import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const FONTS = [
  { label: "Шрифт", value: "" },
  { label: "Обычный", value: "IBM Plex Sans, sans-serif" },
  { label: "Заголовочный", value: "Unbounded, sans-serif" },
  { label: "Моноширинный", value: "JetBrains Mono, monospace" },
  { label: "С засечками", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
];

const SIZES = [
  { label: "Размер", value: "" },
  { label: "Мелкий", value: "2" },
  { label: "Обычный", value: "3" },
  { label: "Средний", value: "4" },
  { label: "Крупный", value: "5" },
  { label: "Огромный", value: "6" },
];

const BLOCKS = [
  { label: "Абзац", value: "p" },
  { label: "Заголовок 1", value: "h2" },
  { label: "Заголовок 2", value: "h3" },
  { label: "Цитата", value: "blockquote" },
];

const btn = "h-8 min-w-8 px-1.5 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-hover transition-colors";
const sel = "h-8 bg-background rounded px-1.5 text-xs text-foreground outline-none border border-input";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const RichEditor = ({ value, onChange }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const [code, setCode] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [snippet, setSnippet] = useState("");

  useEffect(() => {
    if (!code && ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value, code]);

  const save = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) range.current = s.getRangeAt(0);
  };
  const restore = () => {
    ref.current?.focus();
    if (range.current) {
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(range.current);
    }
  };
  const sync = () => ref.current && onChange(ref.current.innerHTML);
  const exec = (cmd: string, arg?: string) => {
    restore();
    document.execCommand("styleWithCSS", false, cmd === "fontSize" ? "false" : "true");
    document.execCommand(cmd, false, arg);
    save();
    sync();
  };

  const insertSnippet = () => {
    if (!snippet.trim()) return;
    exec("insertHTML", snippet);
    setSnippet("");
    setInsertOpen(false);
  };

  return (
    <div className="rounded-lg border border-input bg-rail overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-input bg-card">
        {!code && (
          <>
            <select className={sel} defaultValue="" onChange={(e) => (exec("formatBlock", e.target.value), (e.target.value = ""))}>
              <option value="" disabled>Стиль</option>
              {BLOCKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <select className={sel} defaultValue="" onChange={(e) => (e.target.value && exec("fontName", e.target.value), (e.target.value = ""))}>
              {FONTS.map((f) => <option key={f.label} value={f.value} disabled={!f.value}>{f.label}</option>)}
            </select>
            <select className={sel} defaultValue="" onChange={(e) => (e.target.value && exec("fontSize", e.target.value), (e.target.value = ""))}>
              {SIZES.map((f) => <option key={f.label} value={f.value} disabled={!f.value}>{f.label}</option>)}
            </select>
            <span className="w-px h-5 bg-input mx-0.5" />
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} title="Жирный"><Icon name="Bold" size={15} /></button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} title="Курсив"><Icon name="Italic" size={15} /></button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} title="Подчёркнутый"><Icon name="Underline" size={15} /></button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("strikeThrough")} title="Зачёркнутый"><Icon name="Strikethrough" size={15} /></button>
            <label className={`${btn} relative cursor-pointer`} title="Цвет текста">
              <Icon name="Baseline" size={15} />
              <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => exec("foreColor", e.target.value)} />
            </label>
            <label className={`${btn} relative cursor-pointer`} title="Цвет фона текста">
              <Icon name="Highlighter" size={15} />
              <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => exec("hiliteColor", e.target.value)} />
            </label>
            <span className="w-px h-5 bg-input mx-0.5" />
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyLeft")} title="По левому краю"><Icon name="AlignLeft" size={15} /></button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyCenter")} title="По центру"><Icon name="AlignCenter" size={15} /></button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyRight")} title="По правому краю"><Icon name="AlignRight" size={15} /></button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} title="Список"><Icon name="List" size={15} /></button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")} title="Нумерованный список"><Icon name="ListOrdered" size={15} /></button>
            <button
              type="button"
              className={btn}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const url = window.prompt("Ссылка (https://...)");
                if (url) exec("createLink", url);
              }}
              title="Ссылка"
            >
              <Icon name="Link" size={15} />
            </button>
            <button
              type="button"
              className={btn}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const url = window.prompt("Адрес картинки (https://...)");
                if (url) exec("insertImage", url);
              }}
              title="Картинка"
            >
              <Icon name="Image" size={15} />
            </button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("removeFormat")} title="Очистить оформление"><Icon name="RemoveFormatting" size={15} /></button>
            <span className="w-px h-5 bg-input mx-0.5" />
            <button type="button" className={`${btn} gap-1 text-xs`} onMouseDown={(e) => e.preventDefault()} onClick={() => (save(), setInsertOpen((v) => !v))} title="Вставить HTML-код в место курсора">
              <Icon name="CodeXml" size={15} /> Вставить HTML
            </button>
          </>
        )}
        <button
          type="button"
          className={`${btn} gap-1 text-xs ml-auto ${code ? "text-primary" : ""}`}
          onClick={() => setCode((v) => !v)}
          title="Переключить редактор / HTML-код всей страницы"
        >
          <Icon name={code ? "Type" : "FileCode"} size={15} /> {code ? "Визуальный режим" : "Код страницы"}
        </button>
      </div>

      {insertOpen && !code && (
        <div className="p-2 border-b border-input bg-card/60 space-y-2">
          <textarea
            value={snippet}
            onChange={(e) => setSnippet(e.target.value)}
            rows={5}
            placeholder="<div>...</div>, <iframe ...>, виджет TradingView и т.п."
            className="w-full bg-background rounded p-2 text-xs font-mono text-foreground outline-none border border-input focus:border-primary"
            autoFocus
          />
          <div className="flex gap-2">
            <button type="button" onClick={insertSnippet} className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-semibold">Вставить</button>
            <button type="button" onClick={() => setInsertOpen(false)} className="h-8 px-3 rounded text-xs text-muted-foreground hover:text-white hover:bg-hover">Отмена</button>
          </div>
        </div>
      )}

      {code ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[320px] bg-background p-3 text-xs font-mono text-foreground outline-none"
          spellCheck={false}
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onKeyUp={save}
          onMouseUp={save}
          onBlur={save}
          className="radar-page min-h-[320px] p-3 outline-none text-foreground"
          data-placeholder="Начните писать текст страницы…"
        />
      )}
    </div>
  );
};

export default RichEditor;
