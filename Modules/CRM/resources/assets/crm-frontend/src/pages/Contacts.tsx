import { useEffect, useState } from 'react';
import { fetchContacts, deleteContact, addTag, removeTag } from '@/services/api';
import type { Contact } from '@/types';
import { Search, Upload, Plus, Users, MoreHorizontal, Tag, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const statusColors: Record<string, string> = {
  subscribed: 'bg-success/15 text-success',
  unsubscribed: 'bg-muted text-muted-foreground',
  bounced: 'bg-destructive/15 text-destructive',
};

const tagFilters = ['All', 'VIP', 'Lead', 'Customer', 'Trial', 'Enterprise', 'Churned'];

export default function Contacts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  
  // Tag Dialog State
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  const loadContacts = () => {
    setLoading(true);
    fetchContacts({ search, tag: activeTag === 'All' ? undefined : activeTag })
      .then(r => {
        setContacts(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadContacts();
  }, [search, activeTag]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este contacto?')) return;
    try {
      await deleteContact(id);
      toast({ title: 'Contacto eliminado', description: 'O contacto foi removido com sucesso.' });
      loadContacts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível eliminar o contacto.' });
    }
  };

  const openTagDialog = (id: string) => {
    setSelectedContactId(id);
    setNewTag('');
    setTagDialogOpen(true);
  };

  const handleAddTag = async () => {
    if (!selectedContactId || !newTag.trim()) return;
    try {
      await addTag(selectedContactId, newTag.trim());
      toast({ title: 'Tag adicionada', description: 'A tag foi adicionada com sucesso.' });
      setTagDialogOpen(false);
      loadContacts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar a tag.' });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Contactos</h1>
          <p className="page-subtitle">Gerencie as suas listas de e-mail e subscritores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button className="gap-2" onClick={() => navigate('/contacts/new')}>
            <Plus className="w-4 h-4" /> Novo Contacto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar contactos..."
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {tagFilters.map(t => (
            <button
              key={t}
              onClick={() => setActiveTag(t)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                activeTag === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contacto</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Tags</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Origem</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Estado</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Taxa Abertura</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden xl:table-cell">Taxa Clique</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 px-4"><Skeleton className="h-5 w-48" /></td>
                      <td className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-5 w-32" /></td>
                      <td className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-5 w-24" /></td>
                      <td className="py-3 px-4 hidden lg:table-cell"><Skeleton className="h-5 w-20" /></td>
                      <td className="py-3 px-4 hidden lg:table-cell"><Skeleton className="h-5 w-14 ml-auto" /></td>
                      <td className="py-3 px-4 hidden xl:table-cell"><Skeleton className="h-5 w-14 ml-auto" /></td>
                      <td className="py-3 px-4" />
                    </tr>
                  ))
                : contacts.map(c => (
                    <tr key={c.id} className="border-b border-border/50 table-row-hover">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {c.firstName[0]}{c.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {c.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border">
                              {tag}
                            </span>
                          ))}
                          {c.tags.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] text-muted-foreground">
                              +{c.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-sm text-muted-foreground">
                        {c.source || '-'}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', statusColors[c.status])}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-right font-mono">{c.openRate}%</td>
                      <td className="py-3 px-4 hidden xl:table-cell text-right font-mono">{c.clickRate}%</td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/contacts/${c.id}`)}>
                              Ver Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/contacts/${c.id}/edit`)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openTagDialog(c.id)}>
                              <Tag className="w-4 h-4 mr-2" /> Adicionar Tag
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c.id)}>
                              <Trash className="w-4 h-4 mr-2" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!loading && contacts.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum contacto encontrado</p>
          </div>
        )}
      </div>

      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Tag</DialogTitle>
            <DialogDescription>
              Adicione uma nova tag para organizar este contacto.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tag" className="text-right">Tag</Label>
              <Input
                id="tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="col-span-3"
                placeholder="Ex: VIP"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddTag}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
