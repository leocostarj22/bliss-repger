import { useEffect, useState } from 'react';
import { fetchCampaigns, duplicateCampaign, deleteCampaign } from '@/services/api';
import type { Campaign, CampaignStatus } from '@/types';
import { Search, Plus, MoreHorizontal, Send, Clock, FileEdit, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusConfig: Record<CampaignStatus, { label: string; class: string; icon: React.ElementType }> = {
  draft: { label: 'Rascunho', class: 'badge-draft', icon: FileEdit },
  scheduled: { label: 'Agendada', class: 'badge-scheduled', icon: Clock },
  sending: { label: 'A enviar', class: 'badge-sending', icon: Loader2 },
  sent: { label: 'Enviada', class: 'badge-sent', icon: Send },
};

const statusFilters = ['all', 'draft', 'scheduled', 'sending', 'sent'] as const;

export default function Campaigns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetchCampaigns({ status: statusFilter, search }).then(r => {
        setCampaigns(r.data);
        setLoading(false);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [statusFilter, search]);

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateCampaign(id);
      toast({ title: "Sucesso", description: "Campanha duplicada" });
      const r = await fetchCampaigns({ status: statusFilter, search });
      setCampaigns(r.data);
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao duplicar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar esta campanha?')) return;
    try {
      await deleteCampaign(id);
      toast({ title: "Sucesso", description: "Campanha eliminada" });
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao eliminar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Campanhas</h1>
          <p className="page-subtitle">Crie, gira e acompanhe as suas campanhas de e-mail</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/campaigns/new')}>
          <Plus className="w-4 h-4" /> Nova Campanha
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar campanhas..."
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize',
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s === 'all' ? 'Todas' : statusConfig[s as CampaignStatus]?.label || s}
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
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campanha</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Lista</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Enviada</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Taxa de Abertura</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden xl:table-cell">Taxa de Cliques</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 px-4"><Skeleton className="h-5 w-48" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-5 w-28" /></td>
                      <td className="py-3 px-4 hidden lg:table-cell"><Skeleton className="h-5 w-16 ml-auto" /></td>
                      <td className="py-3 px-4 hidden lg:table-cell"><Skeleton className="h-5 w-14 ml-auto" /></td>
                      <td className="py-3 px-4 hidden xl:table-cell"><Skeleton className="h-5 w-14 ml-auto" /></td>
                      <td className="py-3 px-4" />
                    </tr>
                  ))
                : campaigns.map(c => {
                    const sc = statusConfig[c.status];
                    return (
                      <tr key={c.id} className="border-b border-border/50 table-row-hover">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{c.subject}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', sc.class)}>
                            <sc.icon className={cn('w-3 h-3', c.status === 'sending' && 'animate-spin')} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{c.listName}</td>
                        <td className="py-3 px-4 hidden lg:table-cell text-right font-mono">{c.sentCount > 0 ? c.sentCount.toLocaleString() : '—'}</td>
                        <td className="py-3 px-4 hidden lg:table-cell text-right font-mono">{c.openRate > 0 ? `${c.openRate}%` : '—'}</td>
                        <td className="py-3 px-4 hidden xl:table-cell text-right font-mono">{c.clickRate > 0 ? `${c.clickRate}%` : '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/campaigns/${c.id}`)}>Ver Detalhes</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/campaigns/${c.id}/edit`)}>Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(c.id)}>Duplicar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c.id)}>Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {!loading && campaigns.length === 0 && (
          <div className="py-16 text-center">
            <Send className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma campanha encontrada</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Tente ajustar os filtros ou crie uma nova campanha</p>
          </div>
        )}
      </div>
    </div>
  );
}
