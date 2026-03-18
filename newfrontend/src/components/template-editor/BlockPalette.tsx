import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Type, ImageIcon, MousePointerClick, Minus, Columns, Code, Video, Space, Rss, Share2 } from 'lucide-react';
import type { BlockType } from '@/types/template';

const PALETTE_ITEMS: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: 'text', label: 'Texto', icon: Type },
  { type: 'image', label: 'Imagem', icon: ImageIcon },
  { type: 'button', label: 'Botão', icon: MousePointerClick },
  { type: 'divider', label: 'Divisor', icon: Minus },
  { type: 'columns', label: 'Colunas', icon: Columns },
  { type: 'html', label: 'HTML', icon: Code },
  { type: 'video', label: 'Vídeo', icon: Video },
  { type: 'spacer', label: 'Espaço', icon: Space },
  { type: 'feed', label: 'Feed', icon: Rss },
  { type: 'social', label: 'Redes Sociais', icon: Share2 },
];

export function BlockPalette() {
  return (
    <div className="w-56 shrink-0 border-r border-border bg-card p-4 space-y-3 overflow-y-auto">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Blocos</h3>
      <Droppable droppableId="palette" isDropDisabled>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
            {PALETTE_ITEMS.map((item, index) => (
              <Draggable key={item.type} draggableId={`palette-${item.type}`} index={index}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-secondary/50 cursor-grab text-sm font-medium transition-all hover:border-primary/40 hover:bg-primary/5 ${snap.isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
                  >
                    <item.icon className="w-4 h-4 text-primary shrink-0" />
                    <span>{item.label}</span>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
