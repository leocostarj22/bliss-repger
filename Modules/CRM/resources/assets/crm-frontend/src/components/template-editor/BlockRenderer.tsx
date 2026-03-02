import type { TemplateBlock } from '@/types/template';
import { Droppable, Draggable } from '@hello-pangea/dnd';

interface BlockRendererProps {
  block: TemplateBlock;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  isNested?: boolean;
}

export function BlockRenderer({ block, onSelect, onDelete, isNested = false }: BlockRendererProps) {
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
      const columnsContent = (p.columnsContent as string[]) || [];
      return (
        <div
          style={{ gap: `${Number(p.gap)}px`, gridTemplateColumns: `repeat(${Number(p.columns)}, 1fr)` }}
          className="grid min-h-[60px] rounded border border-dashed border-border/60"
        >
          {Array.from({ length: Number(p.columns) }).map((_, i) => (
            <Droppable key={`${block.id}-col-${i}`} droppableId={`${block.id}-col-${i}`}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[50px] relative p-2 ${
                    snapshot.isDraggingOver ? 'bg-blue-50 border-blue-200' : ''
                  } border-2 border-dashed rounded transition-colors`}
                  style={{ 
                    borderColor: snapshot.isDraggingOver ? '#3b82f6' : '#e5e7eb',
                    backgroundColor: snapshot.isDraggingOver ? '#eff6ff' : 'transparent'
                  }}
                >
                  {block.children && block.children[i] ? (
                    <Draggable key={block.children[i].id} draggableId={block.children[i].id} index={0}>
                      {(prov, dragSnap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={`bg-white rounded border ${
                            dragSnap.isDragging ? 'shadow-lg' : 'shadow-sm'
                          }`}
                        >
                          <BlockRenderer block={block.children[i]} isNested={true} />
                        </div>
                      )}
                    </Draggable>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground h-full flex items-center justify-center">
                      Arraste um bloco para a coluna {i + 1}
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
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
            {p.thumbnailUrl ? (
              // Mostra thumbnail do vídeo se disponível
              <>
                <img 
                  src={String(p.thumbnailUrl)} 
                  alt="Thumbnail do vídeo" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40" />
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl">▶</div>
                  <span className="text-sm font-medium">{String(p.thumbnailText || 'Assista ao vídeo')}</span>
                </div>
              </>
            ) : (
              // Fallback para quando não há thumbnail
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl">▶</div>
                  <span className="text-sm font-medium">{String(p.thumbnailText)}</span>
                </div>
              </>
            )}
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
      const color = String(p.color || '#333333');
      
      const Icons: Record<string, any> = {
        facebook: (
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        ),
        instagram: (
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        ),
        twitter: (
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
        ),
        linkedin: (
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        ),
        youtube: (
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        ),
        tiktok: (
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.14c0 3.48-2.32 6.66-5.79 7.42-3.21.7-6.57-.6-8.23-3.37-1.65-2.77-1.02-6.3 1.57-8.4 2.1-1.69 5.09-1.6 7.26-.05V5.5c-1.04-.62-2.22-.98-3.44-1.01-3.66-.08-6.8 2.56-7.38 6.17-.6 3.66 1.76 7.24 5.3 8.37 3.24 1.03 6.84-.73 8.16-3.87.5-1.19.64-2.48.42-3.76V4.32c-1.44.49-2.8.35-4.08-.41V.02Z"/></svg>
        )
      };

      return (
        <div className="flex gap-3 flex-wrap" style={{ justifyContent: String(p.align) }}>
          {networks.map((n) => (
            <div
              key={n}
              style={{ width: size, height: size, padding: size * 0.22, backgroundColor: color }}
              className="rounded-full text-white flex items-center justify-center transition-opacity hover:opacity-90"
              title={n}
            >
              {Icons[n] || n[0]}
            </div>
          ))}
        </div>
      );
    }
    default:
      return <div className="text-muted-foreground text-xs">Bloco desconhecido</div>;
  }
}
