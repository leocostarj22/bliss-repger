import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { History, RotateCcw, Eye, Trash2 } from 'lucide-react';
import type { TemplateBlock } from '@/types/template';
import type { GlobalStyles } from '@/types/template';

export interface TemplateVersion {
  id: string;
  timestamp: number;
  name: string;
  blocks: TemplateBlock[];
  globalStyles: GlobalStyles;
}

const MAX_VERSIONS = 20;

export function getVersionStorageKey(templateId: string | undefined): string {
  return `template-versions-${templateId || 'new'}`;
}

export function saveVersion(
  templateId: string | undefined,
  name: string,
  blocks: TemplateBlock[],
  globalStyles: GlobalStyles,
  versionId: string,
) {
  const key = getVersionStorageKey(templateId);
  const existing: TemplateVersion[] = JSON.parse(localStorage.getItem(key) || '[]');
  const version: TemplateVersion = {
    id: versionId,
    timestamp: Date.now(),
    name,
    blocks: JSON.parse(JSON.stringify(blocks)),
    globalStyles: { ...globalStyles },
  };
  const updated = [version, ...existing].slice(0, MAX_VERSIONS);
  localStorage.setItem(key, JSON.stringify(updated));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string | undefined;
  onRestore: (version: TemplateVersion) => void;
}

export function VersionHistoryDialog({ open, onOpenChange, templateId, onRestore }: Props) {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [previewVersion, setPreviewVersion] = useState<TemplateVersion | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<TemplateVersion | null>(null);

  useEffect(() => {
    if (!open) return;
    const key = getVersionStorageKey(templateId);
    const stored: TemplateVersion[] = JSON.parse(localStorage.getItem(key) || '[]');
    setVersions(stored);
  }, [open, templateId]);

  const handleDelete = (id: string) => {
    const updated = versions.filter(v => v.id !== id);
    setVersions(updated);
    const key = getVersionStorageKey(templateId);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const handleRestore = (version: TemplateVersion) => {
    onRestore(version);
    onOpenChange(false);
    setRestoreTarget(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico de Versões
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {versions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma versão guardada.</p>
                <p className="text-xs mt-1">As versões são criadas automaticamente ao guardar o template.</p>
              </div>
            ) : (
              versions.map((v, idx) => (
                <div key={v.id} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{v.name}</span>
                      {idx === 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5 shrink-0">
                          Mais recente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(v.timestamp).toLocaleString('pt-PT', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                      {' · '}{v.blocks.length} bloco{v.blocks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setPreviewVersion(v)}
                      title="Pré-visualizar JSON"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/5"
                      onClick={() => setRestoreTarget(v)}
                      title="Restaurar esta versão"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(v.id)}
                      title="Apagar versão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="text-[11px] text-muted-foreground border-t border-border pt-3 shrink-0">
            Máximo de {MAX_VERSIONS} versões guardadas localmente. As versões mais antigas são removidas automaticamente.
          </p>
        </DialogContent>
      </Dialog>

      {/* JSON Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Pré-visualização — {previewVersion?.name}{' '}
              <span className="text-muted-foreground font-normal text-sm">
                ({previewVersion && new Date(previewVersion.timestamp).toLocaleString('pt-PT')})
              </span>
            </DialogTitle>
          </DialogHeader>
          <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-auto max-h-[55vh] whitespace-pre-wrap">
            {previewVersion ? JSON.stringify({ blocks: previewVersion.blocks, globalStyles: previewVersion.globalStyles }, null, 2) : ''}
          </pre>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewVersion(null)}>Fechar</Button>
            <Button size="sm" onClick={() => { setRestoreTarget(previewVersion!); setPreviewVersion(null); }}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restaurar esta versão
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão?</AlertDialogTitle>
            <AlertDialogDescription>
              As alterações actuais não guardadas serão substituídas pela versão de{' '}
              <strong>
                {restoreTarget && new Date(restoreTarget.timestamp).toLocaleString('pt-PT', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreTarget && handleRestore(restoreTarget)}>
              Sim, restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
