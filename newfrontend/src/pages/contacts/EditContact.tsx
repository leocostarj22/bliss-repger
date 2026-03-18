import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ContactForm } from '@/components/contacts/ContactForm';
import { fetchContact, updateContact } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Contact } from '@/types';

export default function EditContact() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchContact(id)
        .then(r => { setContact(r.data); setLoading(false); })
        .catch(() => {
          toast({ variant: 'destructive', title: 'Erro', description: 'Contacto não encontrado.' });
          navigate('/contacts');
        });
    }
  }, [id, navigate, toast]);

  const handleSubmit = async (data: any) => {
    if (!id) return;
    try {
      await updateContact(id, data);
      toast({ title: 'Contacto atualizado', description: 'As alterações foram salvas com sucesso.' });
      navigate('/contacts');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o contacto.' });
    }
  };

  if (loading) {
    return <div className="p-10"><Skeleton className="h-96 w-full max-w-2xl mx-auto" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Contacto</h1>
          <p className="text-muted-foreground">Atualize as informações do contacto</p>
        </div>
      </div>
      
      <div className="glass-card p-6">
        {contact && <ContactForm initialData={contact} onSubmit={handleSubmit} />}
      </div>
    </div>
  );
}