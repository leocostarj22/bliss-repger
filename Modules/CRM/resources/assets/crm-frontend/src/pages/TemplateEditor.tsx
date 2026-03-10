import { useState, useCallback, useEffect } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { ArrowLeft, Monitor, Smartphone, Save, Code2, Eye } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { v4Fallback } from '@/lib/id';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlockPalette } from '@/components/template-editor/BlockPalette';
import { EditorCanvas } from '@/components/template-editor/EditorCanvas';
import { PropertiesPanel } from '@/components/template-editor/PropertiesPanel';
import type { TemplateBlock, BlockType } from '@/types/template';
import { DEFAULT_BLOCK_PROPS } from '@/types/template';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createTemplate, updateTemplate, fetchTemplate } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('Sem Título');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [jsonOpen, setJsonOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [panelWidth, setPanelWidth] = useState<number>(320);

  const startResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelWidth;

    const onMove = (ev: MouseEvent) => {
      const dx = startX - ev.clientX;
      let next = startW + dx;
      if (next < 260) next = 260;
      if (next > 520) next = 520;
      setPanelWidth(next);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null;

  // Auto-save simulation
  useEffect(() => {
    if (blocks.length === 0) return;
    const t = setTimeout(() => {
      localStorage.setItem('template-draft', JSON.stringify(blocks));
    }, 1000);
    return () => clearTimeout(t);
  }, [blocks]);

  // Load draft or existing template
  useEffect(() => {
    if (id) {
      // Load existing template
      fetchTemplate(id)
        .then(response => {
          const tpl = response.data;
          setTemplateName(tpl.name);
          const c = tpl.content;
          if (Array.isArray(c)) {
            setBlocks(c);
          } else if (typeof c === 'string') {
            setBlocks([{
              id: v4Fallback(),
              type: 'html',
              props: { code: c }
            }]);
          } else {
            setBlocks([]);
          }
        })
        .catch(() => {
          toast({ title: 'Erro', description: 'Template não encontrado', variant: 'destructive' });
          navigate('/templates');
        });
      return;
    }

    const saved = localStorage.getItem('template-draft');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
        } else if (typeof parsed === 'string') {
          // Legacy support: convert string content to HTML block
          setBlocks([{
            id: v4Fallback(),
            type: 'html',
            props: { code: parsed }
          }]);
        }
      } catch { /* ignore */ }
    }
  }, [id, navigate, toast]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // From palette to canvas
    if (source.droppableId === 'palette' && destination.droppableId === 'canvas') {
      const type = draggableId.replace('palette-', '') as BlockType;
      const newBlock: TemplateBlock = {
        id: v4Fallback(),
        type,
        props: { ...DEFAULT_BLOCK_PROPS[type] },
      };
      setBlocks(prev => {
        const copy = [...prev];
        copy.splice(destination.index, 0, newBlock);
        return copy;
      });
      setSelectedId(newBlock.id);
      return;
    }

    // From palette to column
    if (source.droppableId === 'palette' && destination.droppableId.includes('-col-')) {
      const type = draggableId.replace('palette-', '') as BlockType;
      const newBlock: TemplateBlock = {
        id: v4Fallback(),
        type,
        props: { ...DEFAULT_BLOCK_PROPS[type] },
      };
      
      const [parentId, colIndex] = destination.droppableId.split('-col-');
      const colIdx = parseInt(colIndex);
      
      setBlocks(prev => prev.map(block => {
        if (block.id === parentId && block.type === 'columns') {
          const newChildren = [...(block.children || [])];
          newChildren[colIdx] = newBlock;
          return { ...block, children: newChildren };
        }
        return block;
      }));
      setSelectedId(newBlock.id);
      return;
    }

    // Reorder within canvas
    if (source.droppableId === 'canvas' && destination.droppableId === 'canvas') {
      setBlocks(prev => {
        const copy = [...prev];
        const [moved] = copy.splice(source.index, 1);
        copy.splice(destination.index, 0, moved);
        return copy;
      });
    }

    // Move from canvas to column
    if (source.droppableId === 'canvas' && destination.droppableId.includes('-col-')) {
      const [parentId, colIndex] = destination.droppableId.split('-col-');
      const colIdx = parseInt(colIndex);
      
      setBlocks(prev => {
        const copy = [...prev];
        const [moved] = copy.splice(source.index, 1);
        
        return copy.map(block => {
          if (block.id === parentId && block.type === 'columns') {
            const newChildren = [...(block.children || [])];
            newChildren[colIdx] = moved;
            return { ...block, children: newChildren };
          }
          return block;
        });
      });
      return;
    }

    // Move between columns
    if (source.droppableId.includes('-col-') && destination.droppableId.includes('-col-')) {
      const [sourceParentId, sourceColIndex] = source.droppableId.split('-col-');
      const [destParentId, destColIndex] = destination.droppableId.split('-col-');
      const sourceIdx = parseInt(sourceColIndex);
      const destIdx = parseInt(destColIndex);
      
      if (sourceParentId !== destParentId || sourceIdx === destIdx) return;
      
      setBlocks(prev => prev.map(block => {
        if (block.id === sourceParentId && block.type === 'columns') {
          const newChildren = [...(block.children || [])];
          const moved = newChildren[sourceIdx];
          newChildren[sourceIdx] = undefined;
          newChildren[destIdx] = moved;
          return { ...block, children: newChildren };
        }
        return block;
      }));
      return;
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const handlePropsChange = useCallback((props: Record<string, unknown>) => {
    if (!selectedId) return;
    setBlocks(prev => prev.map(b => b.id === selectedId ? { ...b, props } : b));
  }, [selectedId]);

  const handleUpdateSelectedBlock = useCallback((updated: TemplateBlock) => {
    setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));
  }, []);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({ title: 'Erro', description: 'O nome do template é obrigatório.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (id) {
        await updateTemplate(id, {
          name: templateName,
          content: blocks,
        });
        toast({ title: 'Sucesso', description: 'Template atualizado com sucesso.' });
      } else {
        await createTemplate({
          name: templateName,
          content: blocks,
        });
        toast({ title: 'Sucesso', description: 'Template salvo com sucesso.' });
        localStorage.removeItem('template-draft');
      }
      navigate('/templates');
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Falha ao salvar template.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const templateJson = JSON.stringify(blocks, null, 2);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/templates">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
          <div className="h-5 w-px bg-border" />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-8 w-64 bg-transparent border-transparent hover:border-input focus:border-input transition-colors"
            placeholder="Nome do Template"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <div className="flex items-center bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                previewMode === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                previewMode === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setJsonOpen(true)}>
            <Code2 className="w-4 h-4" /> JSON
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setCancelConfirmOpen(true)}
          >
            Cancelar
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Editor body */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          <BlockPalette />
          <EditorCanvas
            blocks={blocks}
            selectedId={selectedId}
            previewMode={previewMode}
            onSelect={setSelectedId}
            onDelete={handleDelete}
          />
          <div
            className="w-1 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/40"
            onMouseDown={startResize}
            title="Arraste para ajustar a largura"
          />
          {selectedBlock ? (
            <div style={{ width: panelWidth }} className="shrink-0 h-full">
              <PropertiesPanel block={selectedBlock} onChange={handlePropsChange} onUpdateBlock={handleUpdateSelectedBlock} />
            </div>
          ) : (
            <div style={{ width: panelWidth }} className="shrink-0 h-full border-l border-border bg-card p-4 flex items-center justify-center">
              <p className="text-sm text-muted-foreground text-center">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Selecione um bloco para editar suas propriedades
              </p>
            </div>
          )}
        </div>
      </DragDropContext>

      {/* JSON Modal */}
      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Estrutura JSON do Template</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-auto max-h-[60vh] whitespace-pre-wrap">
            {templateJson}
          </pre>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as alterações não salvas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar a editar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                localStorage.removeItem('template-draft');
                navigate('/templates');
              }}
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
