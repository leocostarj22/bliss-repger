import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CampaignForm, CampaignFormValues } from '@/components/campaigns/CampaignForm';
import { createCampaign, fetchSegments } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewCampaign() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchSegments().then(r => setSegments(r.data));
  }, []);

  const handleSubmit = async (data: CampaignFormValues) => {
    setLoading(true);
    try {
      await createCampaign(data);
      toast({ title: 'Sucesso', description: 'Campanha criada com sucesso' });
      navigate('/campaigns');
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao criar campanha', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="page-title">Nova Campanha</h1>
          <p className="page-subtitle">Criar uma nova campanha de e-mail</p>
        </div>
      </div>
      <div className="glass-card p-6 w-full">
        <CampaignForm onSubmit={handleSubmit} isLoading={loading} segments={segments} />
      </div>
    </div>
  );
}