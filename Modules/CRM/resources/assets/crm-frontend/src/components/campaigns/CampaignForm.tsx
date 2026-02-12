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
  segment_id: z.string().optional(),
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
      segment_id: initialData?.segment_id || initialData?.listId || '',
      content: initialData?.content || '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              {segments.map((segment) => (
                <SelectItem key={segment.id} value={segment.id}>
                  {segment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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