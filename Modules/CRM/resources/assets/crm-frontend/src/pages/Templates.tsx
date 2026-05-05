import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTemplates, deleteTemplate, duplicateTemplate } from '@/services/api';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Eye, Loader2, Copy, Monitor, Smartphone } from 'lucide-react';
import { EmailTemplate } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, playSound } from '@/lib/utils';
import { blocksToHtml } from '@/lib/template-to-html';
import type { GlobalStyles, TemplateBlock } from '@/types/template';


// Componente para gerar thumbnail do template (renderização abstrata melhorada)
function TemplateThumbnail({ content }: { content: any }) {
  const [thumbnail, setThumbnail] = useState<string>('');

  useEffect(() => {
    try {
      let blocks: any[] = [];
      if (Array.isArray(content)) blocks = content;
      else if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) blocks = parsed;
        } catch {}
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const DPR = window.devicePixelRatio || 1;
      const width = 320; const height = 200;
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      ctx.scale(DPR, DPR);

      // Paleta básica com toque de neon
      const accentColors = ['#22d3ee', '#a855f7', '#f97316'];

      // Fundo suave mais claro (bom para modo claro)
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, width, height);

      // Card central claro
      const cardX = 10;
      const cardY = 10;
      const cardW = width - 20;
      const cardH = height - 20;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cardX, cardY, cardW, cardH);

      // Barra superior neon
      const headerGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
      headerGradient.addColorStop(0, '#22d3ee');
      headerGradient.addColorStop(1, '#a855f7');
      ctx.fillStyle = headerGradient;
      ctx.fillRect(cardX, cardY, cardW, 12);

      let y = cardY + 20; const xPad = cardX + 12;
      const drawLine = (w = cardW - 24) => {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(xPad, y, w, 8);
        y += 14;
      };

      const maxItems = 5;
      let count = 0;

      if (blocks.length) {
        for (const b of blocks) {
          if (count >= maxItems || y > height - 30) break;
          switch (b.type) {
            case 'image': {
              ctx.fillStyle = '#f1f5f9';
              ctx.fillRect(xPad, y, cardW - 24, 56);
              ctx.strokeStyle = 'rgba(34,211,238,0.6)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(xPad + 0.5, y + 0.5, cardW - 25, 55);
              ctx.fillStyle = '#64748b';
              ctx.font = '10px sans-serif';
              ctx.fillText('Imagem', xPad + 10, y + 32);
              y += 64; count++; break;
            }
            case 'text': {
              const txt = String(b.props?.content || '').replace(/<[^>]*>/g, '').slice(0, 40);
              if (txt) {
                const color = accentColors[count % accentColors.length];
                ctx.fillStyle = '#eef2ff';
                ctx.fillRect(xPad, y, cardW - 24, 20);
                ctx.fillStyle = color;
                ctx.fillRect(xPad, y, 3, 20);
                ctx.fillStyle = '#0f172a';
                ctx.font = '11px sans-serif';
                ctx.fillText(txt, xPad + 8, y + 13);
                y += 26;
              } else {
                drawLine();
                drawLine(Math.max(60, (cardW - 24) * 0.6));
              }
              count++; break;
            }
            case 'button': {
              const bg = String(b.props?.bgColor || accentColors[0]);
              const btnW = 110, btnH = 26;
              const btnX = xPad;
              const btnY = y;
              const grad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
              grad.addColorStop(0, bg);
              grad.addColorStop(1, accentColors[1]);
              ctx.fillStyle = grad;
              ctx.fillRect(btnX, btnY, btnW, btnH);
              ctx.fillStyle = '#0f172a';
              ctx.globalAlpha = 0.3;
              ctx.fillRect(btnX, btnY + btnH - 6, btnW, 6);
              ctx.globalAlpha = 1;
              ctx.fillStyle = String(b.props?.textColor || '#e5e7eb');
              ctx.font = '10px sans-serif';
              const t = String(b.props?.text || 'Botão').slice(0, 12);
              ctx.fillText(t, btnX + 14, btnY + 17);
              y += 36; count++; break;
            }
            case 'columns': {
              const cols = Number(b.props?.columns) || 2; const gap = 8;
              const colW = (cardW - 24 - gap * (cols - 1)) / cols;
              for (let i = 0; i < cols; i++) {
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(xPad + i * (colW + gap), y, colW, 32);
                ctx.fillStyle = 'rgba(148,163,184,0.35)';
                ctx.fillRect(xPad + i * (colW + gap) + 6, y + 8, colW - 12, 6);
                ctx.fillRect(xPad + i * (colW + gap) + 6, y + 18, colW * 0.6, 6);
              }
              y += 40; count++; break;
            }
            case 'social': {
              const size = 16; const sGap = 10; let sx = xPad;
              for (let i = 0; i < 4; i++) {
                const color = accentColors[i % accentColors.length];
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(sx + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                sx += size + sGap;
              }
              y += size + 14; count++; break;
            }
            case 'divider': {
              ctx.strokeStyle = 'rgba(148,163,184,0.5)';
              ctx.beginPath();
              ctx.moveTo(xPad, y + 4);
              ctx.lineTo(cardX + cardW - 12, y + 4);
              ctx.stroke();
              y += 14; count++; break;
            }
            default: drawLine(); count++; break;
          }
        }
      } else {
        drawLine(); drawLine(); drawLine(cardW * 0.7);
      }

      // Barra inferior suave
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(cardX, cardY + cardH - 10, cardW, 10);
      ctx.fillStyle = 'rgba(100,116,139,0.8)';
      ctx.font = '9px sans-serif';
      ctx.fillText('Pré-visualização', cardX + 12, cardY + cardH - 3);

      setThumbnail(canvas.toDataURL('image/png'));
    } catch {
      setThumbnail('');
    }
  }, [content]);

  return (
    <div className="overflow-hidden h-32 rounded-md border shadow-sm border-border/40 bg-background/80">
      {thumbnail ? (
        <img src={thumbnail} alt="Preview do template" className="object-cover w-full h-full" />
      ) : (
        <div className="flex justify-center items-center w-full h-full text-3xl">📧</div>
      )}
    </div>
  );
}

export default function Templates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetchTemplates();
      setTemplates(response.data);
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      await deleteTemplate(pendingDeleteId);
      playSound('/sounds/recycle.wav', { volume: 0.6 });
      toast({ title: 'Sucesso', description: 'Template excluído com sucesso' });
      loadTemplates();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir template', variant: 'destructive' });
    } finally {
      setDeleteConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    navigate(`/templates/editor/${template.id}`);
  };

  const openPreview = (template: EmailTemplate) => {
    let blocks: TemplateBlock[] = [];
    let globalStyles: GlobalStyles | undefined;
    const c = template.content;
    if (Array.isArray(c)) {
      blocks = c as TemplateBlock[];
    } else if (c && typeof c === 'object' && 'blocks' in (c as object)) {
      const payload = c as { blocks: TemplateBlock[]; globalStyles?: GlobalStyles };
      blocks = payload.blocks || [];
      globalStyles = payload.globalStyles;
    } else if (typeof c === 'string') {
      try { blocks = JSON.parse(c); } catch { blocks = []; }
    }
    const body = blocksToHtml(blocks, globalStyles);
    setPreviewHtml(`<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>*, *::before, *::after { box-sizing: border-box; } body { margin: 0; padding: 0; }</style>
</head>
<body>${body}</body>
</html>`);
    setPreviewDevice('desktop');
    setPreviewOpen(true);
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      await duplicateTemplate(template.id);
      playSound('/sounds/recycle.wav', { volume: 0.4 });
      toast({ title: 'Sucesso', description: `"${template.name}" duplicado com sucesso` });
      loadTemplates();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao duplicar template', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingDeleteId(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="mt-2 text-muted-foreground">Gerencie seus modelos de e-mail</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => {
          localStorage.removeItem('template-draft'); // Clear draft for new template
          navigate('/templates/editor');
        }}>
          <Plus className="mr-2 w-4 h-4" />
          Novo Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="py-12 text-center rounded-lg border bg-card">
          <p className="text-muted-foreground">Nenhum template encontrado.</p>
          <Button variant="link" onClick={() => navigate('/templates/editor')} className="mt-2">
            Criar meu primeiro template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template) => (
            <div key={template.id} className="group relative rounded-xl border border-border bg-card hover:border-cyan-400/60 hover:shadow-[0_0_24px_rgba(34,211,238,0.25)] transition-all p-4 flex flex-col">
              <div className="mb-4">
                <TemplateThumbnail content={template.content || '[]'} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-semibold truncate" title={template.name}>{template.name}</h3>
                <div className="flex gap-2 items-center text-xs text-muted-foreground">
                  <span className="bg-secondary/40 px-2 py-0.5 rounded">
                    {typeof template.content === 'string' ? 'HTML' : 'Blocos'}
                  </span>
                  <span>•</span>
                  <span>{format(new Date(template.updatedAt), "d 'de' MMM", { locale: ptBR })}</span>
                </div>
              </div>
              <div className="flex gap-2 items-center pt-4 mt-4 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(template)}>
                  <Edit className="mr-2 w-4 h-4" />
                  Editar
                </Button>
                <Button variant="ghost" size="icon" title="Pré-visualizar" onClick={() => openPreview(template)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Duplicar template" onClick={() => handleDuplicate(template)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => requestDelete(template.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <DialogTitle>Pré-visualização</DialogTitle>
            <div className="flex items-center bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  previewDevice === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  previewDevice === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden bg-muted flex items-start justify-center p-6">
            <iframe
              key={previewDevice}
              srcDoc={previewHtml}
              title="Preview"
              className="bg-white shadow-xl rounded transition-all duration-300"
              style={{ width: previewDevice === 'desktop' ? 600 : 375, height: '100%', border: 'none' }}
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}