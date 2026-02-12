import { useNavigate } from 'react-router-dom';
import { ContactForm } from '@/components/contacts/ContactForm';
import { createContact } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewContact() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      await createContact(data);
      toast({ title: 'Contacto criado', description: 'O contacto foi adicionado com sucesso.' });
      navigate('/contacts');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar o contacto.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Contacto</h1>
          <p className="text-muted-foreground">Adicione um novo subscritor à sua lista</p>
        </div>
      </div>
      
      <div className="glass-card p-6">
        <ContactForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}