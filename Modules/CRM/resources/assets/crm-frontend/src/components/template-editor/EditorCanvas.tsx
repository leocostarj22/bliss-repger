import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Trash2, GripVertical, Copy } from 'lucide-react';
import type { TemplateBlock, GlobalStyles } from '@/types/template';
import { getFontCss } from '@/types/template';
import { BlockRenderer } from './BlockRenderer';
import { cn } from '@/lib/utils';

interface Props {
  blocks: TemplateBlock[];
  selectedId: string | null;
  previewMode: 'desktop' | 'mobile';
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  globalStyles?: GlobalStyles;
}

export function EditorCanvas({ blocks, selectedId, previewMode, onSelect, onDelete, onDuplicate, globalStyles }: Props) {
  const canvasBg = globalStyles?.canvasBgColor ?? '#f4f4f4';
  const contentBg = globalStyles?.contentBgColor ?? '#ffffff';
  const fontFamily = getFontCss(globalStyles?.fontFamily ?? 'Arial');
  const maxWidth = previewMode === 'mobile' ? '375px' : `${globalStyles?.contentMaxWidth ?? 600}px`;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6" style={{ backgroundColor: canvasBg }}>
      <div
        className="mx-auto rounded-lg shadow-lg transition-all duration-300 min-h-[600px]"
        style={{ backgroundColor: contentBg, maxWidth, fontFamily }}
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
                'p-4 md:p-6 space-y-4 min-h-[400px] transition-colors',
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
                        className="absolute left-2 top-2 md:-left-8 md:top-1/2 md:-translate-y-1/2 translate-y-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 cursor-grab"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Action buttons (duplicate + delete) */}
                      <div className="absolute right-2 top-2 md:-right-8 md:top-1/2 md:-translate-y-1/2 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDuplicate?.(block.id); }}
                          className="text-gray-400 hover:text-blue-500"
                          title="Duplicar bloco (Ctrl+D)"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
                          className="text-gray-400 hover:text-red-500"
                          title="Eliminar bloco"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

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
