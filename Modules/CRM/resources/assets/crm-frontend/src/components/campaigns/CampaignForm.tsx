import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Campaign } from '@/types';
import { Loader2 } from 'lucide-react';

const campaignSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  subject: z.string().min(1, 'O assunto é obrigatório'),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent']),
  channel: z.enum(['email', 'sms', 'whatsapp', 'gocontact']),
  segment_id: z.string().optional(),
  filter_source: z.string().optional(),
  filter_tag: z.string().optional(),
  content: z.string().optional(),
});

export type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  initialData?: Campaign;
  onSubmit: (data: CampaignFormValues) => void;
  isLoading?: boolean;
  segments?: { id: string; name: string }[];
}

export function CampaignForm({ initialData, onSubmit, isLoading, segments = [] }: CampaignFormProps) {
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: initialData?.name || '',
      subject: initialData?.subject || '',
      status: initialData?.status || 'draft',
      channel: initialData?.channel || 'email',
      segment_id: initialData?.segment_id || initialData?.listId || '',
      filter_source: '',
      filter_tag: '',
      content: initialData?.content || '',
    },
  });

  const selectedSegment = form.watch('segment_id');
  const isCustomSegment = selectedSegment === 'custom';

  const handleSubmit = (data: CampaignFormValues) => {
    const payload: any = { ...data };
    
    if (data.segment_id === 'custom') {
      payload.segment_id = null;
      payload.filters = [];
      if (data.filter_source) {
        payload.filters.push({ field: 'source', op: 'eq', value: data.filter_source });
      }
      if (data.filter_tag) {
        payload.filters.push({ field: 'tags', op: 'contains', value: data.filter_tag });
      }
      // Remove virtual fields
      delete payload.filter_source;
      delete payload.filter_tag;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Campanha</Label>
        <Input id="name" {...form.register('name')} placeholder="ex: Saldos de Verão 2024" />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Assunto do E-mail</Label>
        <Input id="subject" {...form.register('subject')} placeholder="ex: Não perca estas ofertas!" />
        {form.formState.errors.subject && (
          <p className="text-sm text-destructive">{form.formState.errors.subject.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="channel">Canal de Envio</Label>
          <Select
            defaultValue={form.getValues('channel')}
            onValueChange={(value) => form.setValue('channel', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="gocontact">GoContact</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            defaultValue={form.getValues('status')}
            onValueChange={(value) => form.setValue('status', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="scheduled">Agendada</SelectItem>
              <SelectItem value="sending">A enviar</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="segment_id">Lista de Destinatários</Label>
          <Select
            defaultValue={form.getValues('segment_id')}
            onValueChange={(value) => form.setValue('segment_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar uma lista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom" className="font-semibold text-primary">
                + Segmentar Agora (Origem/Tag)
              </SelectItem>
              {segments.map((segment) => (
                <SelectItem key={segment.id} value={segment.id}>
                  {segment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isCustomSegment && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/20">
          <div className="space-y-2">
            <Label htmlFor="filter_source">Filtrar por Origem</Label>
            <Input 
              id="filter_source" 
              {...form.register('filter_source')} 
              placeholder="ex: MyFormula" 
            />
            <p className="text-xs text-muted-foreground">Opcional. Deixe vazio para ignorar.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter_tag">Filtrar por Tag</Label>
            <Input 
              id="filter_tag" 
              {...form.register('filter_tag')} 
              placeholder="ex: VIP" 
            />
            <p className="text-xs text-muted-foreground">Opcional. Deixe vazio para ignorar.</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo</Label>
        <Textarea
          id="content"
          {...form.register('content')}
          placeholder="O conteúdo do e-mail vai aqui..."
          className="min-h-[200px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
          {initialData ? 'Atualizar Campanha' : 'Criar Campanha'}
        </Button>
      </div>
    </form>
  );
}