import { useEffect, useState } from 'react';
import { fetchContacts, deleteContact, deleteContactsBySource, addTag, removeTag, createSegment, importContacts } from '@/services/api';
import type { Contact } from '@/types';
import { Search, Upload, Plus, Users, MoreHorizontal, Tag, Trash, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  const [sourceFilter, setSourceFilter] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sourceTotal, setSourceTotal] = useState<number | null>(null);
  
  // Tag Dialog State
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  // Import Dialog State
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSource, setImportSource] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const loadContacts = () => {
    setLoading(true);
    fetchContacts({
      page,
      perPage,
      search,
      tag: activeTag === 'All' ? undefined : activeTag,
      source: sourceFilter || undefined,
    })
      .then(r => {
        setContacts(r.data);
        setTotalPages(r.meta?.totalPages ?? 1);
        setTotal(r.meta?.total ?? r.data.length);
        setLoading(false);
        setSelectedIds(new Set());
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadContacts();
  }, [page, perPage, search, activeTag, sourceFilter]);

  useEffect(() => {
    const src = sourceFilter.trim();
    if (!src) {
      setSourceTotal(null);
      return;
    }

    fetchContacts({ page: 1, perPage: 1, source: src })
      .then((r) => setSourceTotal(r.meta?.total ?? r.data.length))
      .catch(() => setSourceTotal(null));
  }, [sourceFilter]);

  const paginationItems = (() => {
    const items: Array<number | 'left' | 'right'> = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
      return items;
    }

    items.push(1);

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) items.push('left');

    for (let i = start; i <= end; i++) items.push(i);

    if (end < totalPages - 1) items.push('right');

    items.push(totalPages);

    return items;
  })();

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length && contacts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleCreateCampaign = async () => {
    if (selectedIds.size === 0) return;
    const name = prompt("Nome para a nova lista de destinatários (Segmento Estático):");
    if (!name) return;
    
    try {
      const res = await createSegment({ name, contact_ids: Array.from(selectedIds) });
      toast({ title: 'Lista criada', description: 'Redirecionando para nova campanha...' });
      navigate(`/campaigns/new?segment_id=${res.data.id}`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao criar lista.' });
    }
  };

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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Tem a certeza que deseja eliminar ${selectedIds.size} contactos selecionados?`)) return;
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await deleteContact(id);
      }
      toast({ title: 'Contactos eliminados', description: 'Os contactos selecionados foram removidos com sucesso.' });
      loadContacts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível eliminar todos os contactos selecionados.' });
    }
  };

  const handleBulkDeleteBySource = async () => {
    const src = sourceFilter.trim();
    const count = sourceTotal ?? 0;
    if (!src || count <= 0) return;

    if (!confirm(`Tem a certeza que deseja eliminar TODOS os ${count} contactos da origem "${src}"?`)) return;

    try {
      const res = await deleteContactsBySource({ source: src });
      const deleted = res.data.deleted;
      toast({ title: 'Contactos eliminados', description: `Foram removidos ${deleted} contactos da origem "${src}".` });
      setSelectedIds(new Set());
      setPage(1);
      loadContacts();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error?.message || 'Não foi possível apagar todos os contactos da origem.' });
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

  const openImportDialog = () => {
    setImportSource('');
    setImportFile(null);
    setImportDialogOpen(true);
  };

  const handleImport = async () => {
    const source = importSource.trim();
    if (!source) {
      toast({ variant: 'destructive', title: 'Origem obrigatória', description: 'Defina a origem para esta importação.' });
      return;
    }
    if (!importFile) {
      toast({ variant: 'destructive', title: 'Ficheiro obrigatório', description: 'Selecione um ficheiro .xlsx ou .xls.' });
      return;
    }

    setImporting(true);
    try {
      const res = await importContacts({ file: importFile, source, deduplicate: true });
      const r = res.data;
      toast({
        title: 'Importação concluída',
        description: `Novos: ${r.imported} • Atualizados: ${r.updated} • Inválidos: ${r.invalid} • Duplicados no ficheiro: ${r.duplicatesInFile}`,
      });
      setImportDialogOpen(false);
      loadContacts();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao importar', description: error?.message || 'Falha ao importar contactos.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <h1 className="page-title">Contactos</h1>
          <p className="page-subtitle">Gerencie as suas listas de e-mail e subscritores</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"></div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
          <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={openImportDialog}>
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate('/contacts/new')}>
            <Plus className="w-4 h-4" /> Novo Contacto
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">{selectedIds.size} contactos selecionados</span>
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
            {sourceFilter.trim() && (sourceTotal ?? 0) > 0 && (
              <Button size="sm" variant="destructive" onClick={handleBulkDeleteBySource} className="gap-2">
                <Trash className="w-4 h-4" /> Apagar todos ({sourceTotal})
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="gap-2">
              <Trash className="w-4 h-4" /> Apagar Selecionados
            </Button>
            <Button size="sm" onClick={handleCreateCampaign} className="gap-2">
              <Mail className="w-4 h-4" /> Criar Campanha
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Pesquisar contactos..."
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 w-full sm:w-48">
          <input
            value={sourceFilter}
            onChange={e => {
              setPage(1);
              setSourceFilter(e.target.value);
            }}
            placeholder="Filtrar por Origem..."
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {tagFilters.map(t => (
            <button
              key={t}
              onClick={() => {
                setPage(1);
                setActiveTag(t);
              }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                activeTag === t
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_14px_hsl(var(--ring)/0.18)]'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:shadow-[0_0_12px_hsl(var(--ring)/0.12)]'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {loading ? 'Carregando…' : `${total} contactos • Página ${page} de ${totalPages}`}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Por página</span>
          <div className="w-28">
            <Select
              value={String(perPage)}
              onValueChange={(v) => {
                setPage(1);
                setPerPage(Number(v));
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {['25', '100', '250', '500', '1000'].map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-4 w-10">
                  <Checkbox 
                    checked={contacts.length > 0 && selectedIds.size === contacts.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
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
                        <Checkbox 
                          checked={selectedIds.has(c.id)}
                          onCheckedChange={() => toggleSelect(c.id)}
                        />
                      </td>
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
                            <button className="text-muted-foreground hover:text-foreground hover:shadow-[0_0_16px_hsl(var(--ring)/0.15)] hover:-translate-y-0.5 transition-transform rounded-md p-1">
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

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
                className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
              />
            </PaginationItem>

            {paginationItems.map((it, idx) => (
              <PaginationItem key={`${it}-${idx}`}>
                {it === 'left' || it === 'right' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    isActive={it === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(it);
                    }}
                  >
                    {it}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

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

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Contactos</DialogTitle>
            <DialogDescription>
              Importe um ficheiro Excel (.xlsx/.xls). Os contactos serão gravados com a origem definida abaixo e deduplicados por e-mail.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="importSource" className="text-right">Origem</Label>
              <Input
                id="importSource"
                value={importSource}
                onChange={(e) => setImportSource(e.target.value)}
                className="col-span-3"
                placeholder="Ex: loja, landing, parceiros"
                disabled={importing}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="importFile" className="text-right">Ficheiro</Label>
              <Input
                id="importFile"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="col-span-3"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                disabled={importing}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>Cancelar</Button>
            <Button onClick={handleImport} disabled={importing}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
