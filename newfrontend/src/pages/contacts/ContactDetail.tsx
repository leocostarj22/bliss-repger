import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchContact, addTag, removeTag } from '@/services/api';
import type { Contact } from '@/types';
import { ArrowLeft, Mail, Phone, Calendar, Tag, Activity, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');

  const loadContact = () => {
    if (id) {
      fetchContact(id)
        .then(r => { setContact(r.data); setLoading(false); })
        .catch(() => navigate('/contacts'));
    }
  };

  useEffect(() => {
    loadContact();
  }, [id, navigate]);

  const handleRemoveTag = async (tag: string) => {
    if (!id) return;
    try {
      await removeTag(id, tag);
      loadContact();
      toast({ title: 'Tag removida' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao removar tag' });
    }
  };

  const handleAddTag = async () => {
    if (!id || !newTag.trim()) return;
    try {
      await addTag(id, newTag.trim());
      setNewTag('');
      loadContact();
      toast({ title: 'Tag adicionada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar tag' });
    }
  };

  if (loading || !contact) {
    return <div className="p-10"><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{contact.name}</h1>
            <Badge variant={contact.status === 'subscribed' ? 'default' : 'secondary'}>
              {contact.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{contact.email}</p>
        </div>
        <Button onClick={() => navigate(`/contacts/${id}/edit`)}>Editar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="glass-card p-6 space-y-6 col-span-2">
          <h2 className="text-lg font-semibold mb-4">Informações Pessoais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">E-mail</label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{contact.email}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Telefone</label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{contact.phone || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Origem</label>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span>{contact.source || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Criado em</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{new Date(contact.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Última Atividade</label>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span>{contact.lastActivity ? new Date(contact.lastActivity).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Tags
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {contact.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                    &times;
                  </button>
                </Badge>
              ))}
              {contact.tags.length === 0 && <span className="text-sm text-muted-foreground">Sem tags</span>}
            </div>
            
            <div className="flex gap-2 items-center max-w-xs">
              <Input 
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova tag..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleAddTag} disabled={!newTag.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="glass-card p-6 space-y-6">
          <h2 className="text-lg font-semibold">Desempenho</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Taxa de Abertura</span>
                <span className="text-sm font-bold">{contact.openRate}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${contact.openRate}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Taxa de Clique</span>
                <span className="text-sm font-bold">{contact.clickRate}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${contact.clickRate}%` }} />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="text-sm text-muted-foreground">
            <p className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" /> 0 e-mails recebidos
            </p>
            <p className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4" /> 0 cliques em links
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}