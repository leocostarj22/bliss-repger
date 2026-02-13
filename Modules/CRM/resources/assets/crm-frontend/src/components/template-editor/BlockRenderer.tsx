import type { TemplateBlock } from '@/types/template';

export function BlockRenderer({ block }: { block: TemplateBlock }) {
  const p = block.props;

  switch (block.type) {
    case 'text':
      return (
        <div
          style={{ fontSize: Number(p.fontSize), color: String(p.color), textAlign: p.align as 'left' | 'center' | 'right' }}
          className="min-h-[24px] whitespace-pre-wrap break-words"
        >
          {String(p.content)}
        </div>
      );

    case 'image':
      return (
        <div className="flex justify-center">
          <img
            src={String(p.src)}
            alt={String(p.alt)}
            style={{ width: String(p.width), maxWidth: '100%' }}
            className="rounded"
          />
        </div>
      );

    case 'button':
      return (
        <div style={{ textAlign: p.align as 'left' | 'center' | 'right' }}>
          <a
            href={String(p.url)}
            onClick={(e) => e.preventDefault()}
            style={{
              backgroundColor: String(p.bgColor),
              color: String(p.textColor),
              borderRadius: `${Number(p.borderRadius)}px`,
            }}
            className="inline-block px-6 py-3 font-semibold text-sm no-underline"
          >
            {String(p.text)}
          </a>
        </div>
      );

    case 'divider':
      return (
        <div style={{ margin: `${Number(p.margin)}px 0` }}>
          <hr style={{ borderColor: String(p.color), borderTopWidth: `${Number(p.height)}px` }} className="border-0 border-t" />
        </div>
      );

    case 'columns':
      return (
        <div
          style={{ gap: `${Number(p.gap)}px`, gridTemplateColumns: `repeat(${Number(p.columns)}, 1fr)` }}
          className="grid min-h-[60px] rounded border border-dashed border-border/60"
        >
          {Array.from({ length: Number(p.columns) }).map((_, i) => (
            <div key={i} className="p-4 text-center text-xs text-muted-foreground">
              Coluna {i + 1}
            </div>
          ))}
        </div>
      );

    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: String(p.code) }} />;
case 'video':
      return (
        <div className="flex justify-center">
          <div
            style={{ width: String(p.width), maxWidth: '100%' }}
            className="relative rounded overflow-hidden bg-gray-900 text-white flex items-center justify-center min-h-[180px] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl">▶</div>
              <span className="text-sm font-medium">{String(p.thumbnailText)}</span>
            </div>
          </div>
        </div>
      );
    case 'spacer':
      return <div style={{ height: `${Number(p.height)}px` }} className="w-full" />;
    case 'feed': {
      const count = Number(p.items) || 3;
      const vertical = String(p.layout) === 'vertical';
      return (
        <div className={vertical ? 'space-y-3' : 'grid grid-cols-3 gap-3'}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="border border-dashed border-gray-300 rounded-lg p-3 flex gap-3 items-start">
              <div className="w-16 h-16 shrink-0 rounded bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 bg-gray-200 rounded" />
                <div className="h-2 w-full bg-gray-100 rounded" />
                <div className="h-2 w-2/3 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'social': {
      const networks = (p.networks as string[]) || [];
      const size = Number(p.iconSize) || 28;
      const iconMap: Record<string, string> = {
        facebook: 'f', instagram: '📷', twitter: '𝕏', linkedin: 'in', youtube: '▶', tiktok: '♪',
      };
      return (
        <div className="flex gap-3 flex-wrap" style={{ justifyContent: String(p.align) }}>
          {networks.map((n) => (
            <div
              key={n}
              style={{ width: size, height: size, fontSize: size * 0.45 }}
              className="rounded-full bg-gray-700 text-white flex items-center justify-center font-bold"
              title={n}
            >
              {iconMap[n] || n[0]}
            </div>
          ))}
        </div>
      );
    }
    default:
      return <div className="text-muted-foreground text-xs">Bloco desconhecido</div>;
  }
}
