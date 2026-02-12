import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCampaign, fetchCampaignLogs } from '@/services/api';
import { Campaign } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Edit, Send, MousePointerClick, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = () => {
    setLoading(true);
    fetchCampaign(id!).then(r => {
      setCampaign(r.data);
      setLoading(false);
    });
  };

  const loadLogs = () => {
    setLoadingLogs(true);
    fetchCampaignLogs(id!).then(r => {
      setLogs(r.data.data); // Laravel paginate returns { data: [...], ... }
      setLoadingLogs(false);
    });
  };

  if (loading) {
    return <div className="space-y-6 animate-pulse">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>;
  }

  if (!campaign) return <div>Campanha não encontrada</div>;

  return (
    <div className="space-y-6 animate-slide-up w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize 
                ${campaign.status === 'sent' ? 'bg-green-100 text-green-800' : 
                  campaign.status === 'sending' ? 'bg-blue-100 text-blue-800' : 
                  campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-muted-foreground">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={loadData} title="Atualizar">
             <RefreshCw className="w-4 h-4" />
           </Button>
           <Button onClick={() => navigate(`/campaigns/${id}/edit`)} className="gap-2">
             <Edit className="w-4 h-4" /> Editar Campanha
           </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4" onValueChange={(val) => {
        if (val === 'logs' && logs.length === 0) loadLogs();
      }}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="content">Conteúdo & Config</TabsTrigger>
          <TabsTrigger value="logs">Logs de Envio</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card p-4 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Send className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Enviada</span>
              </div>
              <div className="text-2xl font-bold">{campaign.sentCount}</div>
            </div>
            <div className="stat-card p-4 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Taxa de Abertura</span>
              </div>
              <div className="text-2xl font-bold">{campaign.openRate}%</div>
            </div>
            <div className="stat-card p-4 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MousePointerClick className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Taxa de Cliques</span>
              </div>
              <div className="text-2xl font-bold">{campaign.clickRate}%</div>
            </div>
            <div className="stat-card p-4 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Taxa de Rejeição</span>
              </div>
              <div className="text-2xl font-bold">{campaign.bounceRate}%</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 border rounded-lg bg-card shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Detalhes da Campanha</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <dt className="text-muted-foreground">Assunto:</dt>
                  <dd className="font-medium">{campaign.subject}</dd>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <dt className="text-muted-foreground">Remetente:</dt>
                  <dd className="font-medium">{campaign.fromName} &lt;{campaign.fromEmail}&gt;</dd>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <dt className="text-muted-foreground">Lista:</dt>
                  <dd className="font-medium">{campaign.listName}</dd>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <dt className="text-muted-foreground">Criado em:</dt>
                  <dd className="font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <div className="glass-card p-6 border rounded-lg bg-card shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Pré-visualização do Conteúdo</h3>
            <div className="prose max-w-none dark:prose-invert bg-white dark:bg-gray-900 p-4 rounded-md border min-h-[300px]">
               {campaign.content || 'Conteúdo indisponível'}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <div className="rounded-md border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Aberto em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingLogs ? (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center py-8">Carregando logs...</TableCell>
                   </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum registro de envio encontrado.</TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.contact?.email || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize
                          ${log.status === 'opened' ? 'bg-green-100 text-green-800' :
                            log.status === 'bounced' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'}`}>
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell>{log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}</TableCell>
                      <TableCell>{log.opened_at ? new Date(log.opened_at).toLocaleString() : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}