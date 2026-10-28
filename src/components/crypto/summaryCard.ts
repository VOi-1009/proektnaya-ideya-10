export const cardCls = (border: string, interactive = false) =>
  `bg-hover rounded-lg px-3 h-[48px] border-l-4 ${border} flex flex-col justify-center items-start text-left min-w-0 overflow-hidden ${
    interactive ? "hover:brightness-110 transition-all" : ""
  }`;

export const labelCls = "text-muted-foreground text-[11px] leading-tight line-clamp-2 w-full";
export const valueCls = "font-mono text-white tabular text-sm leading-tight mt-0.5 truncate w-full";