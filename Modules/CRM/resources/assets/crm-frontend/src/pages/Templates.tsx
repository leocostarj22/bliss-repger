import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTemplates, deleteTemplate } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { EmailTemplate } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="group relative border rounded-lg bg-card hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-32 bg-secondary/30 rounded-md flex items-center justify-center mb-4">
                   <span className="text-4xl">📧</span>
                </div>
                <h3 className="font-semibold text-lg truncate" title={template.name}>{template.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Atualizado em {format(new Date(template.updatedAt), "d 'de' MMM, yyyy", { locale: ptBR })}
                </p>
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