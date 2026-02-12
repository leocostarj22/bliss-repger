import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CampaignForm, CampaignFormValues } from '@/components/campaigns/CampaignForm';
import { fetchCampaign, updateCampaign, fetchSegments } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campaign } from '@/types';

export default function EditCampaign() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (id) {
      fetchCampaign(id).then(r => setCampaign(r.data));
    }
    fetchSegments().then(r => setSegments(r.data));
  }, [id]);

  const handleSubmit = async (data: CampaignFormValues) => {
    if (!id) return;
    setLoading(true);
    try {
      await updateCampaign(id, data);
      toast({ title: 'Sucesso', description: 'Campanha atualizada com sucesso' });
      navigate('/campaigns');
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao atualizar campanha', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) return <div>Loading...</div>;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="page-title">Editar Campanha</h1>
          <p className="page-subtitle">Atualizar detalhes da campanha</p>
        </div>
      </div>
      <div className="glass-card p-6 max-w-2xl">
        <CampaignForm initialData={campaign} onSubmit={handleSubmit} isLoading={loading} segments={segments} />
      </div>
    </div>
  );
}