import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Trash2, GripVertical } from 'lucide-react';
import type { TemplateBlock } from '@/types/template';
import { BlockRenderer } from './BlockRenderer';
import { cn } from '@/lib/utils';

interface Props {
  blocks: TemplateBlock[];
  selectedId: string | null;
  previewMode: 'desktop' | 'mobile';
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function EditorCanvas({ blocks, selectedId, previewMode, onSelect, onDelete }: Props) {
  return (
    <div className="flex-1 overflow-auto p-6 bg-muted/30">
      <div
        className={cn(
          'mx-auto bg-white rounded-lg shadow-lg transition-all duration-300 min-h-[600px]',
          previewMode === 'desktop' ? 'max-w-[640px]' : 'max-w-[375px]'
        )}
      >
        {/* Email header preview */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-2 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-2 w-40 bg-gray-100 rounded" />
        </div>

        <Droppable droppableId="canvas">
          {(provided, snap) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'p-6 space-y-3 min-h-[400px] transition-colors',
                snap.isDraggingOver && 'bg-primary/5'
              )}
            >
              {blocks.length === 0 && !snap.isDraggingOver && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <p className="text-sm font-medium">Arraste blocos aqui</p>
                  <p className="text-xs mt-1">Monte seu template de email</p>
                </div>
              )}

              {blocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(prov, dragSnap) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      onClick={() => onSelect(block.id)}
                      className={cn(
                        'group relative rounded-md border transition-all cursor-pointer',
                        selectedId === block.id
                          ? 'border-[hsl(185,65%,48%)] ring-2 ring-[hsl(185,65%,48%)]/20'
                          : 'border-transparent hover:border-gray-200',
                        dragSnap.isDragging && 'shadow-xl'
                      )}
                    >
                      {/* Grip handle */}
                      <div
                        {...prov.dragHandleProps}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 cursor-grab"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="p-3">
                        <BlockRenderer block={block} />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}
