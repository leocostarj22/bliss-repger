import { useState, useCallback, useEffect, useRef } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { ArrowLeft, Monitor, Smartphone, Save, Code2, Eye, Sparkles, Undo2, Redo2, History, FileCode } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { v4Fallback } from '@/lib/id';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlockPalette } from '@/components/template-editor/BlockPalette';
import { EditorCanvas } from '@/components/template-editor/EditorCanvas';
import { PropertiesPanel } from '@/components/template-editor/PropertiesPanel';
import { GlobalStylesPanel } from '@/components/template-editor/GlobalStylesPanel';
import { AiTemplateDialog } from '@/components/template-editor/AiTemplateDialog';
import { VersionHistoryDialog, saveVersion, type TemplateVersion } from '@/components/template-editor/VersionHistoryDialog';
import { HTMLImportDialog } from '@/components/template-editor/HTMLImportDialog';
import type { TemplateBlock, BlockType, GlobalStyles } from '@/types/template';
import { DEFAULT_BLOCK_PROPS, DEFAULT_GLOBAL_STYLES } from '@/types/template';
import { cn, playSound } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  const isMobile = useIsMobile();
  const [panelWidth, setPanelWidth] = useState<number>(320);
  const [propsOpen, setPropsOpen] = useState(false);
  const [aiTemplateOpen, setAiTemplateOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [htmlImportOpen, setHtmlImportOpen] = useState(false);
  const [globalStyles, setGlobalStyles] = useState<GlobalStyles>(DEFAULT_GLOBAL_STYLES);

  // History system (undo/redo)
  const blocksRef = useRef<TemplateBlock[]>([]);
  const historyPast = useRef<TemplateBlock[][]>([]);
  const historyFuture = useRef<TemplateBlock[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const propHistoryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isChangingPropsRef = useRef(false);

  // Keep blocksRef in sync for use inside stable callbacks
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

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

  // Pushes a snapshot of current blocks into the past stack
  const pushToHistory = useCallback(() => {
    historyPast.current = [...historyPast.current, JSON.parse(JSON.stringify(blocksRef.current))].slice(-50);
    historyFuture.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (!historyPast.current.length) return;
    const previous = historyPast.current.pop()!;
    historyFuture.current = [JSON.parse(JSON.stringify(blocksRef.current)), ...historyFuture.current].slice(0, 50);
    setBlocks(previous);
    setSelectedId(null);
    setCanUndo(historyPast.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (!historyFuture.current.length) return;
    const next = historyFuture.current.shift()!;
    historyPast.current = [...historyPast.current, JSON.parse(JSON.stringify(blocksRef.current))].slice(-50);
    setBlocks(next);
    setSelectedId(null);
    setCanUndo(true);
    setCanRedo(historyFuture.current.length > 0);
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    const block = blocksRef.current.find(b => b.id === id);
    if (!block) return;
    const cloneWithNewId = (b: TemplateBlock): TemplateBlock => ({
      ...b,
      id: v4Fallback(),
      props: { ...b.props },
      children: b.children?.map(cloneWithNewId),
    });
    const duplicate = cloneWithNewId(block);
    pushToHistory();
    setBlocks(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(b => b.id === id);
      copy.splice(idx + 1, 0, duplicate);
      return copy;
    });
    setSelectedId(duplicate.id);
  }, [pushToHistory]);

  // Keyboard shortcuts: Ctrl+Z, Ctrl+Shift+Z, Ctrl+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'd' && selectedId) {
        e.preventDefault();
        handleDuplicate(selectedId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectedId, handleDuplicate]);

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null;

  // Auto-save to localStorage
  useEffect(() => {
    if (blocks.length === 0) return;
    const t = setTimeout(() => {
      localStorage.setItem('template-draft', JSON.stringify({ blocks, globalStyles }));
    }, 1000);
    return () => clearTimeout(t);
  }, [blocks, globalStyles]);

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
          } else if (c && typeof c === 'object' && 'blocks' in (c as object)) {
            const payload = c as { blocks: TemplateBlock[]; globalStyles?: GlobalStyles };
            setBlocks(payload.blocks || []);
            if (payload.globalStyles) setGlobalStyles(payload.globalStyles);
          } else if (typeof c === 'string') {
            setBlocks([{ id: v4Fallback(), type: 'html', props: { code: c } }]);
          } else {
            setBlocks([]);
          }
          // Clear history when loading a saved template
          historyPast.current = [];
          historyFuture.current = [];
          setCanUndo(false);
          setCanRedo(false);
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
        } else if (parsed && typeof parsed === 'object' && 'blocks' in parsed) {
          setBlocks(parsed.blocks || []);
          if (parsed.globalStyles) setGlobalStyles(parsed.globalStyles);
        } else if (typeof parsed === 'string') {
          setBlocks([{ id: v4Fallback(), type: 'html', props: { code: parsed } }]);
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
      pushToHistory();
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

      pushToHistory();
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
      pushToHistory();
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

      pushToHistory();
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

      pushToHistory();
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
  }, [pushToHistory]);

  const handleDelete = useCallback((id: string) => {
    pushToHistory();
    playSound('/sounds/recycle.wav', { volume: 0.6 });
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, pushToHistory]);

  const handlePropsChange = useCallback((props: Record<string, unknown>) => {
    if (!selectedId) return;
    // Push to history only at the START of a prop editing session (debounced reset)
    if (!isChangingPropsRef.current) {
      pushToHistory();
      isChangingPropsRef.current = true;
    }
    if (propHistoryTimer.current) clearTimeout(propHistoryTimer.current);
    propHistoryTimer.current = setTimeout(() => { isChangingPropsRef.current = false; }, 1000);
    setBlocks(prev => prev.map(b => b.id === selectedId ? { ...b, props } : b));
  }, [selectedId, pushToHistory]);

  const handleUpdateSelectedBlock = useCallback((updated: TemplateBlock) => {
    pushToHistory();
    setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));
  }, [pushToHistory]);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({ title: 'Erro', description: 'O nome do template é obrigatório.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const content = { blocks, globalStyles };
    try {
      if (id) {
        await updateTemplate(id, { name: templateName, content });
        saveVersion(id, templateName, blocks, globalStyles, v4Fallback());
        toast({ title: 'Sucesso', description: 'Template atualizado com sucesso.' });
      } else {
        await createTemplate({ name: templateName, content });
        saveVersion(undefined, templateName, blocks, globalStyles, v4Fallback());
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

  const handleHTMLImport = useCallback((imported: TemplateBlock[], mode: 'replace' | 'append') => {
    pushToHistory();
    if (mode === 'replace') {
      setBlocks(imported);
      setSelectedId(null);
    } else {
      setBlocks(prev => [...prev, ...imported]);
    }
    toast({ title: `${imported.length} bloco${imported.length !== 1 ? 's' : ''} importado${imported.length !== 1 ? 's' : ''}` });
  }, [pushToHistory, toast]);

  const handleRestore = (version: TemplateVersion) => {
    setBlocks(version.blocks);
    setGlobalStyles(version.globalStyles);
    setSelectedId(null);
    historyPast.current = [];
    historyFuture.current = [];
    setCanUndo(false);
    setCanRedo(false);
  };

  const templateJson = JSON.stringify(blocks, null, 2);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-2 border-b border-border bg-card shrink-0">
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
            className="h-8 w-full max-w-[16rem] sm:w-64 bg-transparent border-transparent hover:border-input focus:border-input transition-colors"
            placeholder="Nome do Template"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="outline"
              size="sm"
              className="px-2"
              onClick={undo}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="px-2"
              onClick={redo}
              disabled={!canRedo}
              title="Refazer (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>

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

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 md:hidden"
            onClick={() => setPropsOpen(true)}
            disabled={!selectedBlock}
          >
            <Eye className="w-4 h-4" /> Propriedades
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-primary border-primary/40 hover:bg-primary/5"
            onClick={() => setAiTemplateOpen(true)}
          >
            <Sparkles className="w-4 h-4" /> Gerar com IA
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setVersionsOpen(true)}>
            <History className="w-4 h-4" /> Histórico
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setHtmlImportOpen(true)}>
            <FileCode className="w-4 h-4" /> Importar HTML
          </Button>
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
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <BlockPalette />
          <EditorCanvas
            blocks={blocks}
            selectedId={selectedId}
            previewMode={previewMode}
            globalStyles={globalStyles}
            onSelect={(nextId) => {
              setSelectedId(nextId);
              if (isMobile) setPropsOpen(true);
            }}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />

          <div
            className="hidden md:block w-1 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/40"
            onMouseDown={startResize}
            title="Arraste para ajustar a largura"
          />

          <div className="hidden md:block">
            <div style={{ width: panelWidth }} className="shrink-0 h-full">
              {selectedBlock ? (
                <PropertiesPanel block={selectedBlock} onChange={handlePropsChange} onUpdateBlock={handleUpdateSelectedBlock} />
              ) : (
                <GlobalStylesPanel value={globalStyles} onChange={setGlobalStyles} />
              )}
            </div>
          </div>

          {isMobile && (
            <Sheet open={propsOpen} onOpenChange={setPropsOpen}>
              <SheetContent side="right" className="w-full sm:max-w-md bg-card p-0">
                <div className="h-full overflow-y-auto p-4">
                  {selectedBlock ? (
                    <PropertiesPanel block={selectedBlock} onChange={handlePropsChange} onUpdateBlock={handleUpdateSelectedBlock} />
                  ) : (
                    <GlobalStylesPanel value={globalStyles} onChange={setGlobalStyles} />
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </DragDropContext>

      <AiTemplateDialog
        open={aiTemplateOpen}
        onOpenChange={setAiTemplateOpen}
        onApply={(generatedBlocks) => {
          setBlocks(generatedBlocks);
          setSelectedId(null);
        }}
      />

      <VersionHistoryDialog
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        templateId={id}
        onRestore={handleRestore}
      />

      <HTMLImportDialog
        open={htmlImportOpen}
        onOpenChange={setHtmlImportOpen}
        onImport={handleHTMLImport}
      />

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
