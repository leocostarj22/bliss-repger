import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHref } from 'react-router-dom';
import { Campaign, EmailTemplate } from '@/types';
import { Loader2 } from 'lucide-react';
import { blocksToHtml } from '@/lib/template-to-html';
import { fetchSegmentEstimate, fetchSegmentEstimateByFilters, fetchTemplate, createSegment } from '@/services/api';
import { Eye, Edit, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const campaignSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  subject: z.string().min(1, 'O assunto é obrigatório'),
  preheader: z.string().optional(),
  from_name: z.string().optional(),
  from_email: z.string().email('Email inválido').optional().or(z.literal('')),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent']),
  channel: z.enum(['email', 'sms', 'whatsapp', 'gocontact']),
  segment_id: z.string().optional(),
  filter_source: z.string().optional(),
  filter_tag: z.string().optional(),
  content: z.string().optional(),
  track_opens: z.boolean().default(true),
  track_clicks: z.boolean().default(true),
  track_replies: z.boolean().default(false),
  use_google_analytics: z.boolean().default(false),
  is_public: z.boolean().default(true),
  physical_address: z.string().optional(),
  translate_to_contact_lang: z.boolean().default(false),
  scheduled_at: z.string().optional(),
});

export type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  initialData?: Campaign;
  onSubmit: (data: CampaignFormValues) => void;
  isLoading?: boolean;
  segments?: { id: string; name: string }[];
  templates?: EmailTemplate[];
}

export function CampaignForm({ initialData, onSubmit, isLoading, segments = [], templates = [] }: CampaignFormProps) {
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: initialData?.name || '',
      subject: initialData?.subject || '',
      preheader: initialData?.preheader || '',
      from_name: initialData?.fromName || '',
      from_email: initialData?.fromEmail || '',
      status: initialData?.status || 'draft',
      channel: initialData?.channel || 'email',
      segment_id: initialData?.segment_id || initialData?.listId || '',
      filter_source: '',
      filter_tag: '',
      content: initialData?.content || '',
      track_opens: initialData?.trackOpens ?? true,
      track_clicks: initialData?.trackClicks ?? true,
      track_replies: initialData?.trackReplies ?? false,
      use_google_analytics: initialData?.useGoogleAnalytics ?? false,
      is_public: initialData?.isPublic ?? true,
      physical_address: initialData?.physicalAddress || '',
      translate_to_contact_lang: false,
    },
  });

  const selectedSegment = form.watch('segment_id');
  const [estimated, setEstimated] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isRefreshingTemplate, setIsRefreshingTemplate] = useState(false);
  const editorBaseUrl = useHref('/templates/editor');

  useEffect(() => {
    setEstimated(null);
    if (selectedSegment && selectedSegment !== 'custom') {
      fetchSegmentEstimate(String(selectedSegment))
        .then(r => setEstimated(r.data.estimated))
        .catch(() => setEstimated(null));
    }
  }, [selectedSegment]);

  const isCustomSegment = selectedSegment === 'custom';
  const filterSource = form.watch('filter_source');
  const filterTag = form.watch('filter_tag');

  useEffect(() => {
    if (isCustomSegment) {
      const filters: any[] = [];
      if (filterSource) filters.push({ field: 'source', op: 'eq', value: filterSource });
      if (filterTag) filters.push({ field: 'tags', op: 'contains', value: filterTag });
      if (filters.length === 0) { setEstimated(null); return; }
      fetchSegmentEstimateByFilters({ filters })
        .then(r => setEstimated(r.data.estimated))
        .catch(() => setEstimated(null));
    }
  }, [isCustomSegment, filterSource, filterTag]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const htmlContent = blocksToHtml(template.content);
      form.setValue('content', htmlContent);
      setSelectedTemplateId(templateId);
      toast.success('Modelo carregado com sucesso!');
    }
  };

  const handleRefreshTemplate = async () => {
    if (!selectedTemplateId) return;
    
    setIsRefreshingTemplate(true);
    try {
      const response = await fetchTemplate(selectedTemplateId);
      if (response.data) {
        const htmlContent = blocksToHtml(response.data.content);
        form.setValue('content', htmlContent);
        toast.success('Conteúdo do modelo atualizado!');
      }
    } catch (error) {
      console.error('Erro ao atualizar modelo:', error);
      toast.error('Falha ao atualizar o modelo.');
    } finally {
      setIsRefreshingTemplate(false);
    }
  };

  const handleEditTemplate = () => {
    if (selectedTemplateId) {
      // Robust URL construction for the editor using React Router context
      const url = `${window.location.origin}${editorBaseUrl}/${selectedTemplateId}`;
      window.open(url, '_blank');
      toast.info('Edite o modelo na nova aba e clique em "Atualizar Visualização" quando terminar.');
    }
  };

  const handleDisconnectTemplate = () => {
    setSelectedTemplateId(null);
    toast.info('Modo de edição livre ativado. A formatação complexa pode ser perdida.');
  };

  const handleSubmit = async (data: CampaignFormValues) => {
    const payload: any = { ...data };
    
    if (data.segment_id === 'custom') {
      try {
        const segmentName = `Auto Segment - ${data.name} - ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
        const filters = [];
        if (data.filter_source) filters.push({ field: 'source', op: 'eq', value: data.filter_source });
        if (data.filter_tag) filters.push({ field: 'tags', op: 'contains', value: data.filter_tag });
        
        // Create a real segment because backend ProcessCampaigns requires a segment_id
        const res = await createSegment({ name: segmentName, filters });
        if (res.data && res.data.id) {
           payload.segment_id = String(res.data.id);
        } else {
           toast.error("Falha ao criar segmento automático. O ID não foi retornado.");
           return;
        }
      } catch (e) {
         console.error(e);
         toast.error("Erro ao criar segmento automático para a campanha.");
         return;
      }
      
      // Remove virtual fields
      delete payload.filter_source;
      delete payload.filter_tag;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Header Section */}
        <div className="p-5 border rounded-lg bg-card shadow-sm space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Cabeçalho do E-mail</h3>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Campanha (Interno)</Label>
            <Input id="name" {...form.register('name')} placeholder="ex: Saldos de Verão 2024" />
            {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Linha de Assunto</Label>
            <Input id="subject" {...form.register('subject')} placeholder="ex: Não perca estas ofertas!" />
            {form.formState.errors.subject && <p className="text-sm text-destructive">{form.formState.errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preheader">Pré Cabeçalho</Label>
            <Input id="preheader" {...form.register('preheader')} placeholder="Texto exibido após o assunto (opcional)" />
            <p className="text-xs text-muted-foreground">Se deixado em branco, será apresentada a primeira linha do seu e-mail.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_name">De nome</Label>
              <Input id="from_name" {...form.register('from_name')} placeholder="ex: Minha Empresa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_email">Do e-mail</Label>
              <Input id="from_email" {...form.register('from_email')} placeholder="ex: newsletter@empresa.com" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 border rounded-lg bg-card shadow-sm space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Conteúdo</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Corpo do E-mail</Label>
              <div className="w-64">
                <Select onValueChange={handleTemplateSelect} value={selectedTemplateId || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Carregar modelo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedTemplateId ? (
              <div className="border rounded-md overflow-hidden bg-background">
                <div className="bg-muted/40 p-3 border-b flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>Visualização do Modelo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefreshTemplate}
                      disabled={isRefreshingTemplate}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshingTemplate ? 'animate-spin' : ''}`} />
                      Atualizar Visualização
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      onClick={handleEditTemplate}
                    >
                      <Edit className="w-3.5 h-3.5 mr-2" />
                      Editar Modelo Original
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDisconnectTemplate}
                    >
                      <X className="w-3.5 h-3.5 mr-2" />
                      Usar Editor Livre
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 bg-white min-h-[400px] max-h-[600px] overflow-y-auto">
                  <div 
                    className="prose max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: form.watch('content') || '' }} 
                  />
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 text-xs text-yellow-800 dark:text-yellow-200 border-t border-yellow-100 dark:border-yellow-900/30 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    Você está usando um modelo pré-definido. Para garantir a melhor formatação, edite o modelo original.
                    Se precisar fazer ajustes rápidos manuais, clique em "Usar Editor Livre", mas note que alguns estilos complexos podem ser perdidos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="min-h-[350px]">
                <RichTextEditor
                  value={form.watch('content') || ''}
                  onChange={(value) => form.setValue('content', value)}
                  placeholder="Escreva o conteúdo do seu e-mail aqui. Use 'Variáveis' para personalizar com o nome do cliente."
                />
              </div>
            )}

            {form.formState.errors.content && (
              <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
            )}
          </div>

          <div className="flex items-start space-x-2 pt-4 border-t">
            <Checkbox id="translate" 
              checked={form.watch('translate_to_contact_lang')} 
              onCheckedChange={(c) => form.setValue('translate_to_contact_lang', c as boolean)} 
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="translate" className="cursor-pointer font-medium">Traduzir para o idioma do contacto</Label>
              <p className="text-xs text-muted-foreground">Esta funcionalidade deteta o idioma do contacto e traduz o e-mail.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Status & Action */}
        <div className="p-5 border rounded-lg bg-card shadow-sm space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Publicação</h3>
          
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              defaultValue={form.getValues('status')}
              onValueChange={(value) => form.setValue('status', value as any)}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="sending">A enviar</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.watch('status') === 'scheduled' && (
            <div className="space-y-2 p-3 bg-muted/30 rounded border">
              <Label htmlFor="scheduled_at">Agendar Envio</Label>
              <Input 
                id="scheduled_at" 
                type="datetime-local" 
                {...form.register('scheduled_at')} 
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="channel">Canal</Label>
            <Select
              defaultValue={form.getValues('channel')}
              onValueChange={(value) => form.setValue('channel', value as any)}
            >
              <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="gocontact">GoContact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            {initialData ? 'Atualizar Campanha' : 'Criar Campanha'}
          </Button>
        </div>

        {/* Recipients */}
        <div className="p-5 border rounded-lg bg-card shadow-sm space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Destinatários</h3>
          <div className="space-y-2">
            <Label htmlFor="segment_id">Lista / Segmento</Label>
            <Select
              defaultValue={form.getValues('segment_id')}
              onValueChange={(value) => form.setValue('segment_id', value)}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar destinatários" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom" className="font-semibold text-primary">+ Segmentar Agora (Origem/Tag)</SelectItem>
                {segments.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>{segment.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCustomSegment && (
            <div className="space-y-3 p-3 bg-muted/30 rounded border">
              <div className="space-y-1">
                <Label htmlFor="filter_source" className="text-xs">Origem</Label>
                <Input id="filter_source" {...form.register('filter_source')} className="h-8" placeholder="ex: MyFormula" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter_tag" className="text-xs">Tag</Label>
                <Input id="filter_tag" {...form.register('filter_tag')} className="h-8" placeholder="ex: VIP" />
              </div>
            </div>
          )}
          
          <div className="pt-2 flex justify-between items-center text-sm text-muted-foreground">
            <span>Total estimado:</span>
            <span className="font-mono font-bold">{estimated !== null ? estimated : '--'}</span>
          </div>
        </div>

        {/* Settings */}
        <div className="p-5 border rounded-lg bg-card shadow-sm space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Acompanhamento</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="track_opens" 
              checked={form.watch('track_opens')} 
              onCheckedChange={(c) => form.setValue('track_opens', c as boolean)} 
            />
            <Label htmlFor="track_opens" className="cursor-pointer">Abrir/Ler acompanhamento</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="track_clicks" 
              checked={form.watch('track_clicks')} 
              onCheckedChange={(c) => form.setValue('track_clicks', c as boolean)} 
            />
            <Label htmlFor="track_clicks" className="cursor-pointer">Acompanhamento de hiperligações</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="track_replies" 
              checked={form.watch('track_replies')} 
              onCheckedChange={(c) => form.setValue('track_replies', c as boolean)} 
            />
            <Label htmlFor="track_replies" className="cursor-pointer">Acompanhamento de respostas</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="use_google_analytics" 
              checked={form.watch('use_google_analytics')} 
              onCheckedChange={(c) => form.setValue('use_google_analytics', c as boolean)} 
            />
            <Label htmlFor="use_google_analytics" className="cursor-pointer">Google Analytics</Label>
          </div>
        </div>

        {/* Footer Settings */}
        <div className="p-5 border rounded-lg bg-card shadow-sm space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Rodapé & Legal</h3>
          
          <div className="space-y-2">
            <Label htmlFor="physical_address">Morada Física</Label>
            <Input id="physical_address" {...form.register('physical_address')} placeholder="Endereço para o rodapé" />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="is_public" 
              checked={form.watch('is_public')} 
              onCheckedChange={(c) => form.setValue('is_public', c as boolean)} 
            />
            <Label htmlFor="is_public" className="cursor-pointer">Arquivo Público</Label>
          </div>
        </div>
      </div>
    </form>
  );
}