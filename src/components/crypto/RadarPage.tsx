import { useEffect, useMemo, useRef, useState } from "react";

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=JetBrains+Mono&family=Unbounded:wght@500;700&display=swap');
html,body{margin:0;padding:0;background:transparent;color:#e6e6e6;font-family:'IBM Plex Sans',sans-serif;font-size:15px;line-height:1.65;word-wrap:break-word}
h1,h2,h3{font-family:Unbounded,sans-serif;color:#fff;margin:.8em 0 .4em}
h2{font-size:1.5rem}h3{font-size:1.15rem}
p,div{margin:.35em 0}
a{color:#f97316}
ul{list-style:disc;padding-left:1.4em}ol{padding-left:1.4em}
blockquote{border-left:3px solid #f97316;padding-left:.9em;color:#9ca3af;font-style:italic;margin:.6em 0}
img,iframe,video{max-width:100%;border-radius:8px}
table{border-collapse:collapse}td,th{border:1px solid #333;padding:4px 8px}
`;

const RESIZE = `<script>(function(){var id=${"__ID__"};function s(){parent.postMessage({radarPage:id,h:document.documentElement.scrollHeight},'*')}new ResizeObserver(s).observe(document.body);window.addEventListener('load',s);setInterval(s,1500);s()})()</script>`;

const RadarPage = ({ html, minHeight = 120 }: { html: string; minHeight?: number }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(minHeight);
  const id = useMemo(() => Math.floor(Math.random() * 1e9), []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source === ref.current?.contentWindow && e.data?.radarPage === id) setH(Math.max(minHeight, Math.ceil(e.data.h) + 4));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [id, minHeight]);

  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${STYLE}</style></head><body>${html}${RESIZE.replace("__ID__", String(id))}</body></html>`;

  return (
    <iframe
      ref={ref}
      srcDoc={doc}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
      className="w-full border-0 block"
      style={{ height: h }}
      title="Страница радара"
    />
  );
};

export default RadarPage;
