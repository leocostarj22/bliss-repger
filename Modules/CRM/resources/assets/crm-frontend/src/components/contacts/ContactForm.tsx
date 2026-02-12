import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Contact } from '@/types';
import { Loader2 } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  status: z.enum(['subscribed', 'unsubscribed', 'bounced']),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormProps {
  initialData?: Contact;
  onSubmit: (data: ContactFormValues) => void;
  isLoading?: boolean;
}

export function ContactForm({ initialData, onSubmit, isLoading }: ContactFormProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: initialData?.name || (initialData ? `${initialData.firstName} ${initialData.lastName}` : ''),
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      status: initialData?.status || 'subscribed',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo</Label>
        <Input id="name" {...form.register('name')} placeholder="ex: João Silva" />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" {...form.register('email')} placeholder="ex: joao@exemplo.com" />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" {...form.register('phone')} placeholder="ex: +351 912 345 678" />
        {form.formState.errors.phone && (
          <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
        )}
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
            <SelectItem value="subscribed">Subscrito</SelectItem>
            <SelectItem value="unsubscribed">Cancelado</SelectItem>
            <SelectItem value="bounced">Devolvido (Bounced)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
          {initialData ? 'Atualizar Contacto' : 'Criar Contacto'}
        </Button>
      </div>
    </form>
  );
}