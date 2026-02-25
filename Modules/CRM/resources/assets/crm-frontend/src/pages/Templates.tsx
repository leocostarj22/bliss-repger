import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTemplates, deleteTemplate } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { EmailTemplate } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


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

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f6f7f9';
      ctx.fillRect(0, 0, width, 10);

      let y = 18; const xPad = 16;
      const drawLine = (w = width - 2 * xPad) => {
        ctx.fillStyle = '#e5e7eb';
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
              ctx.fillStyle = '#e5e7eb';
              ctx.fillRect(xPad, y, width - 2 * xPad, 56);
              ctx.fillStyle = '#9ca3af';
              ctx.font = '10px sans-serif';
              ctx.fillText('Imagem', xPad + 8, y + 32);
              y += 64; count++; break;
            }
            case 'text': {
              const txt = String(b.props?.content || '').replace(/<[^>]*>/g, '').slice(0, 40);
              if (txt) {
                ctx.fillStyle = '#334155';
                ctx.font = '12px sans-serif';
                ctx.fillText(txt, xPad, y + 10);
                y += 20;
              } else {
                drawLine();
                drawLine(Math.max(60, (width - 2 * xPad) * 0.6));
              }
              count++; break;
            }
            case 'button': {
              const bg = String(b.props?.bgColor || '#1a8a8a');
              ctx.fillStyle = bg; const btnW = 90, btnH = 24;
              ctx.fillRect(xPad, y, btnW, btnH);
              ctx.fillStyle = String(b.props?.textColor || '#ffffff');
              ctx.font = '10px sans-serif';
              const t = String(b.props?.text || 'Botão').slice(0, 10);
              ctx.fillText(t, xPad + 18, y + 16);
              y += 34; count++; break;
            }
            case 'columns': {
              const cols = Number(b.props?.columns) || 2; const gap = 8;
              const colW = (width - 2 * xPad - gap * (cols - 1)) / cols;
              for (let i = 0; i < cols; i++) {
                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(xPad + i * (colW + gap), y, colW, 36);
              }
              y += 44; count++; break;
            }
            case 'social': {
              const size = 18; const sGap = 8; let sx = xPad;
              ctx.fillStyle = '#1f2937';
              for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(sx + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.fill(); sx += size + sGap; }
              y += size + 12; count++; break;
            }
            case 'divider': {
              ctx.strokeStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(xPad, y + 4); ctx.lineTo(width - xPad, y + 4); ctx.stroke(); y += 12; count++; break;
            }
            default: drawLine(); count++; break;
          }
        }
      } else {
        drawLine(); drawLine(); drawLine(width * 0.7);
      }

      ctx.fillStyle = '#f6f7f9'; ctx.fillRect(0, height - 10, width, 10);
      setThumbnail(canvas.toDataURL('image/png'));
    } catch {
      setThumbnail('');
    }
  }, [content]);

  return (
    <div className="h-32 rounded-md overflow-hidden border border-border/20 bg-white">
      {thumbnail ? (
        <img src={thumbnail} alt="Preview do template" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-3xl">📧</div>
      )}
    </div>
  );
}

export default function Templates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      await deleteTemplate(id);
      toast({ title: 'Sucesso', description: 'Template excluído com sucesso' });
      loadTemplates();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir template', variant: 'destructive' });
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    navigate(`/templates/editor/${template.id}`);
  };

  return (
    <div className="space-y-6 animate-slide-up p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-2">Gerencie seus modelos de e-mail</p>
        </div>
        <Button onClick={() => {
          localStorage.removeItem('template-draft'); // Clear draft for new template
          navigate('/templates/editor');
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <p className="text-muted-foreground">Nenhum template encontrado.</p>
          <Button variant="link" onClick={() => navigate('/templates/editor')} className="mt-2">
            Criar meu primeiro template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="group relative border rounded-lg bg-card hover:shadow-lg transition-all p-4 flex flex-col">
              <div className="mb-4">
                <TemplateThumbnail content={template.content || '[]'} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-sm truncate" title={template.name}>{template.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-secondary/40 px-2 py-0.5 rounded">
                    {typeof template.content === 'string' ? 'HTML' : 'Blocos'}
                  </span>
                  <span>•</span>
                  <span>{format(new Date(template.updatedAt), "d 'de' MMM", { locale: ptBR })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(template)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}