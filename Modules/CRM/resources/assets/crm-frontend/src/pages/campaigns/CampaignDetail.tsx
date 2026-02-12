import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCampaign } from '@/services/api';
import { Campaign } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Edit, Send, MousePointerClick, Eye, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCampaign(id).then(r => {
        setCampaign(r.data);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="space-y-6 animate-pulse">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>;
  }

  if (!campaign) return <div>Campanha não encontrada</div>;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="page-title">{campaign.name}</h1>
            <p className="page-subtitle">{campaign.subject}</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/campaigns/${id}/edit`)} className="gap-2">
          <Edit className="w-4 h-4" /> Editar Campanha
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Send className="w-4 h-4" />
            <span className="text-xs font-medium">Enviada</span>
          </div>
          <div className="text-2xl font-bold">{campaign.sentCount}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-medium">Taxa de Abertura</span>
          </div>
          <div className="text-2xl font-bold">{campaign.openRate}%</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MousePointerClick className="w-4 h-4" />
            <span className="text-xs font-medium">Taxa de Cliques</span>
          </div>
          <div className="text-2xl font-bold">{campaign.clickRate}%</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">Taxa de Rejeição</span>
          </div>
          <div className="text-2xl font-bold">{campaign.bounceRate}%</div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Pré-visualização do Conteúdo</h3>
        <div className="prose max-w-none dark:prose-invert bg-white dark:bg-gray-900 p-4 rounded-md border">
           {campaign.content || 'Conteúdo indisponível'}
        </div>
      </div>
    </div>
  );
}