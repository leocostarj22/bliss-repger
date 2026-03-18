import { useEffect, useState } from 'react';
import { fetchAutomations } from '@/services/api';
import type { Automation } from '@/types';
import { Plus, Play, Pause, FileEdit, Workflow, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const statusConfig = {
  active: { label: 'Ativo', class: 'bg-success/15 text-[hsl(var(--success))] border border-border', icon: Play },
  paused: { label: 'Pausado', class: 'bg-warning/15 text-[hsl(var(--warning))] border border-border', icon: Pause },
  draft: { label: 'Rascunho', class: 'bg-muted text-muted-foreground border border-border', icon: FileEdit },
};

export default function Automations() {
  const navigate = useNavigate();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAutomations()
      .then(r => { setAutomations(r.data); setLoading(false); })
      .catch(async (err) => {
        console.error('Falha ao carregar automações, usando dados simulados:', err);
        const m = await import('@/services/mockData');
        setAutomations(m.mockAutomations);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Automações</h1>
          <p className="page-subtitle">Crie fluxos de trabalho e sequências de e-mail automatizadas</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <Button className="gap-2" onClick={() => navigate('/automations/new')}>
          <Plus className="w-4 h-4" /> Nova Automação
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(automations || []).filter(Boolean).map((a, i) => {
            const sc = statusConfig[a.status as keyof typeof statusConfig] ?? { label: a.status, class: 'bg-muted text-muted-foreground border border-border', icon: FileEdit };
            const nodesCount = Array.isArray(a.nodes) ? a.nodes.length : 0;
            const connectionsCount = Array.isArray(a.connections) ? a.connections.length : 0;
            return (
              <div
                key={a.id}
                onClick={() => navigate(`/automations/${a.id}`)}
                className="glass-card p-5 flex flex-col gap-4 hover:border-primary/30 hover:shadow-[0_0_24px_hsl(var(--ring)/0.16)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/15 to-fuchsia-500/15 border border-primary/20 flex items-center justify-center shadow-sm">
                    <Workflow className="w-5 h-5 text-primary" />
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', sc.class, 'shadow-sm')}>
                    <sc.icon className="w-3 h-3" />
                    {sc.label}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold">{a.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {nodesCount} passos · {connectionsCount} conexões
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{Number(a.triggeredCount ?? 0).toLocaleString()} disparos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{nodesCount} nós</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state card */}
          <button 
            onClick={() => navigate('/automations/new')}
            className="border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all duration-300 min-h-[200px]"
          >
            <Plus className="w-8 h-8" />
            <span className="text-sm font-medium">Criar Automação</span>
          </button>
        </div>
      )}
    </div>
  );
}
