import { HomeBlock, useHomeBlocks } from "@/lib/blocks";

const Half = ({ text, image }: { text: string; image: string }) => (
  <div className="p-4 sm:p-6 flex flex-col gap-3 min-w-0">
    {image && <img src={image} alt="" className="w-full rounded-lg object-cover max-h-80" loading="lazy" />}
    {text && <p className="text-sm sm:text-base text-foreground/90 whitespace-pre-line leading-relaxed">{text}</p>}
  </div>
);

export const HomeBlockView = ({ block }: { block: HomeBlock }) => (
  <div className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in">
    {block.title && (
      <h3 className="font-display text-lg sm:text-xl text-white px-4 sm:px-6 pt-4 sm:pt-6">{block.title}</h3>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
      <Half text={block.leftText} image={block.leftImage} />
      <Half text={block.rightText} image={block.rightImage} />
    </div>
  </div>
);

export const SideBlockView = ({ block }: { block: HomeBlock }) => (
  <div className="bg-rail rounded-lg overflow-hidden">
    {block.leftImage && <img src={block.leftImage} alt="" className="w-full max-h-48 object-cover" loading="lazy" />}
    <div className="p-3 space-y-1.5">
      {block.title && <h3 className="text-white text-sm font-semibold">{block.title}</h3>}
      {block.leftText && <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{block.leftText}</p>}
    </div>
  </div>
);

export const SideBlocks = () => {
  const { data } = useHomeBlocks("side");
  if (!data?.length) return null;
  return (
    <div className="space-y-3">
      {data.map((b) => (
        <SideBlockView key={b.id} block={b} />
      ))}
    </div>
  );
};

const HomeBlocks = () => {
  const { data } = useHomeBlocks("main");
  if (!data?.length) return null;
  return (
    <div className="space-y-5">
      {data.map((b) => (
        <HomeBlockView key={b.id} block={b} />
      ))}
    </div>
  );
};

export default HomeBlocks;
