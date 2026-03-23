import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCampaign, fetchCampaignLogs, sendCampaignNow } from '@/services/api';
import { Campaign } from '@/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, Edit, Send, MousePointerClick, Eye, AlertTriangle, RefreshCw, UserX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
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
    fetchCampaignLogs(id!)
      .then(r => {
        setLogs(r.data);
        setLoadingLogs(false);
      })
      .catch(err => {
        console.error('Falha ao carregar logs da campanha', err);
        setLogs([]);
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
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border
                ${campaign.status === 'sent' ? 'bg-success/15 text-[hsl(var(--success))] border-success/30' :
                  campaign.status === 'sending' ? 'bg-info/15 text-[hsl(var(--info))] border-info/30' :
                  campaign.status === 'draft' ? 'bg-muted text-muted-foreground border-border' : 'bg-warning/15 text-[hsl(var(--warning))] border-warning/30'}`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-muted-foreground">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto sm:flex-row sm:items-center">
           <Button variant="outline" size="sm" onClick={loadData} title="Atualizar" className="w-full sm:w-auto">
             <RefreshCw className="w-4 h-4" />
           </Button>
           {campaign.channel === 'email' && (campaign.status === 'draft' || campaign.status === 'scheduled') && (
             <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={async () => {
               try {
                 const r = await sendCampaignNow(campaign.id);
                 toast({ title: 'Envio iniciado', description: `${r.queued ?? 0} e-mails em processamento` });
                 loadData();
               } catch (e: any) {
                 toast({ title: 'Erro', description: e?.message ?? 'Falha ao enviar agora', variant: 'destructive' });
               }
             }}>
               <Send className="w-4 h-4" /> Enviar agora
             </Button>
           )}
           <Button onClick={() => navigate(`/campaigns/${id}/edit`)} className="gap-2 w-full sm:w-auto">
             <Edit className="w-4 h-4" /> Editar Campanha
           </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4" onValueChange={(val) => {
        if (val === 'logs' && logs.length === 0) loadLogs();
      }}>
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger className="whitespace-nowrap" value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="content">Conteúdo & Config</TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="logs">Logs de Envio</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <span className="text-xs font-medium uppercase">Abertura</span>
              </div>
              <div className="text-2xl font-bold">{campaign.openRate}%</div>
            </div>
            <div className="stat-card p-4 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MousePointerClick className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Cliques</span>
              </div>
              <div className="text-2xl font-bold">{campaign.clickRate}%</div>
            </div>
            <div className="stat-card p-4 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Rejeição</span>
              </div>
              <div className="text-2xl font-bold">{campaign.bounceRate}%</div>
            </div>
            <div className="stat-card p-4 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <UserX className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Descadastro</span>
              </div>
              <div className="text-2xl font-bold">{campaign.unsubscribeRate ?? 0}%</div>
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
                  <dd className="font-medium">
                    {campaign.fromEmail
                      ? `${campaign.fromName || 'Sem nome'} <${campaign.fromEmail}>`
                      : 'Não definido'}
                  </dd>
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
          <div className="glass-card p-6 border rounded-lg bg-card shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Pré-visualização do Conteúdo</h3>
              <div className="prose max-w-none dark:prose-invert bg-white dark:bg-gray-900 p-4 rounded-md border min-h-[300px] overflow-x-auto [&_p]:mb-3 [&_p]:mt-3 [&_div]:mb-3 [&_div]:mt-3 [&_table]:mb-3 [&_table]:mt-3">
                {campaign.content ? (
                  <div dangerouslySetInnerHTML={{ __html: campaign.content }} />
                ) : (
                  <span className="text-muted-foreground">Conteúdo indisponível.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="text-sm font-semibold mb-3">Configurações de Acompanhamento</h4>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Acompanhar Aberturas:</dt>
                    <dd className="font-medium">{campaign.trackOpens ? 'Ativo' : 'Desativado'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Acompanhar Cliques:</dt>
                    <dd className="font-medium">{campaign.trackClicks ? 'Ativo' : 'Desativado'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Acompanhar Respostas:</dt>
                    <dd className="font-medium">{campaign.trackReplies ? 'Ativo' : 'Desativado'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Google Analytics:</dt>
                    <dd className="font-medium">{campaign.useGoogleAnalytics ? 'Ativo' : 'Desativado'}</dd>
                  </div>
                </dl>
              </div>

              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="text-sm font-semibold mb-3">Outras Configurações</h4>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Público:</dt>
                    <dd className="font-medium">{campaign.isPublic ? 'Sim' : 'Não'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Endereço Físico:</dt>
                    <dd className="font-medium max-w-[220px] text-right truncate" title={campaign.physicalAddress || ''}>
                      {campaign.physicalAddress || 'Não definido'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <div className="rounded-md border bg-card shadow-sm overflow-x-auto">
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border
                          ${log.status === 'opened' ? 'bg-success/15 text-[hsl(var(--success))] border-success/30' :
                            log.status === 'clicked' ? 'bg-info/15 text-[hsl(var(--info))] border-info/30' :
                            log.status === 'bounced' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                            log.status === 'unsubscribed' ? 'bg-warning/15 text-[hsl(var(--warning))] border-warning/30' :
                            'bg-muted text-muted-foreground border-border'}`}>
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