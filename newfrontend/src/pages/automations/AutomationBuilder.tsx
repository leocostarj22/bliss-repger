import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Play, Plus, Trash2, Settings, Zap, Mail, Clock, CheckCircle, Split } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutomationNode } from '@/types';
import { fetchAutomation, createAutomation, updateAutomation } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// Mock initial data
const initialNodes: AutomationNode[] = [];

export default function AutomationBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nodes, setNodes] = useState<AutomationNode[]>(initialNodes);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [name, setName] = useState('Nova Automação');
  const [status, setStatus] = useState<'draft' | 'active' | 'paused'>('draft');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      setLoading(true);
      fetchAutomation(id)
        .then(res => {
          setName(res.data.name);
          setStatus(res.data.status);
          // Backend returns nodes in graph_data or via accessors if implemented
          const automation = res.data;
          // Check for nodes directly (from accessor) or in graph_data
          if (automation.nodes && Array.isArray(automation.nodes)) {
             setNodes(automation.nodes);
          } else if ((automation as any).graph_data?.nodes) {
             setNodes((automation as any).graph_data.nodes);
          }
        })
        .catch(err => {
          toast({ title: 'Erro', description: 'Falha ao carregar automação', variant: 'destructive' });
          navigate('/automations');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate, toast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = {
        name,
        status,
        nodes: nodes,
        connections: [] // We need to implement connections logic later
      };

      if (id === 'new') {
        const res = await createAutomation(data);
        toast({ title: 'Sucesso', description: 'Automação criada com sucesso' });
        navigate(`/automations/${res.data.id}`);
      } else if (id) {
        await updateAutomation(id, data);
        toast({ title: 'Sucesso', description: 'Automação salva com sucesso' });
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar automação', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addNode = (type: AutomationNode['type'], label: string, actionType?: string) => {
    const newNode: AutomationNode = {
      id: crypto.randomUUID(),
      type,
      label,
      config: actionType ? { action: actionType } : {},
      position: { x: 300, y: (nodes.length * 150) + 50 }, // Simple vertical stacking for now
    };
    setNodes([...nodes, newNode]);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-6">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between bg-card z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/automations')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("w-2 h-2 rounded-full", status === 'active' ? "bg-green-500" : "bg-yellow-500")}></span>
              {status === 'active' ? 'Ativo' : 'Rascunho'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button size="sm" onClick={() => setStatus(status === 'active' ? 'paused' : 'active')}>
            <Play className="w-4 h-4 mr-2" />
            {status === 'active' ? 'Pausar' : 'Ativar'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Tools) */}
        <div className="w-64 border-r border-border bg-card/50 p-4 overflow-y-auto flex flex-col gap-6">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Gatilhos</h3>
            <div className="space-y-2">
              <ToolButton icon={Zap} label="Novo Contacto" onClick={() => addNode('trigger', 'Novo Contacto')} />
              <ToolButton icon={Zap} label="Tag Adicionada" onClick={() => addNode('trigger', 'Tag Adicionada')} />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Ações</h3>
            <div className="space-y-2">
              <ToolButton icon={Mail} label="Enviar Email" onClick={() => addNode('action', 'Enviar Email', 'send_email')} />
              <ToolButton icon={CheckCircle} label="Adicionar Tag" onClick={() => addNode('action', 'Adicionar Tag', 'add_tag')} />
              <ToolButton icon={Trash2} label="Remover Tag" onClick={() => addNode('action', 'Remover Tag', 'remove_tag')} />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Lógica</h3>
            <div className="space-y-2">
              <ToolButton icon={Clock} label="Esperar" onClick={() => addNode('delay', 'Esperar')} />
              <ToolButton icon={Split} label="Condição (Se/Então)" onClick={() => addNode('condition', 'Condição')} />
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-muted/30 p-8 overflow-auto relative flex flex-col items-center gap-8">
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <p>Adicione um gatilho para começar</p>
                </div>
            )}
            
            {/* Visualizing Nodes as a vertical flow */}
            {nodes.map((node, index) => (
                <div key={node.id} className="relative group">
                    {/* Connection Line */}
                    {index > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-border"></div>
                    )}
                    
                    <div 
                        onClick={() => setSelectedNode(node.id)}
                        className={cn(
                            "w-80 p-4 rounded-xl border bg-card shadow-sm cursor-pointer transition-all hover:border-primary/50 hover:shadow-md relative",
                            selectedNode === node.id ? "border-primary ring-1 ring-primary" : "border-border"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                node.type === 'trigger' ? "bg-blue-500/10 text-blue-500" :
                                node.type === 'action' ? "bg-green-500/10 text-green-500" :
                                node.type === 'delay' ? "bg-orange-500/10 text-orange-500" :
                                "bg-purple-500/10 text-purple-500"
                            )}>
                                {getNodeIcon(node.type)}
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">{node.label}</h4>
                                <p className="text-xs text-muted-foreground capitalize">{node.type}</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="ml-auto opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNodes(nodes.filter(n => n.id !== node.id));
                                    if (selectedNode === node.id) setSelectedNode(null);
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Add Button between nodes (Visual hint) */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3 h-3" />
                    </div>
                </div>
            ))}
        </div>

        {/* Right Panel (Settings) */}
        {selectedNode && (() => {
            const node = nodes.find(n => n.id === selectedNode);
            if (!node) return null;

            const updateConfig = (key: string, value: any) => {
                setNodes(nodes.map(n => 
                    n.id === selectedNode 
                        ? { ...n, config: { ...n.config, [key]: value } } 
                        : n
                ));
            };

            return (
            <div className="w-80 border-l border-border bg-card p-4 overflow-y-auto animate-slide-in-right shadow-xl z-20 h-full fixed right-0 top-0 bottom-0 pt-20">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg">Configurações</h3>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>
                
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Nome do Passo</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-1 focus:ring-primary"
                            value={node.label}
                            onChange={(e) => {
                                setNodes(nodes.map(n => n.id === selectedNode ? { ...n, label: e.target.value } : n));
                            }}
                        />
                    </div>
                    
                            {/* Dynamic Fields based on Action Type */}
                    {node.config?.action === 'add_tag' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Tag a Adicionar</label>
                            <input 
                                type="text" 
                                placeholder="Ex: VIP, Cliente Novo"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={node.config?.tag || ''}
                                onChange={(e) => updateConfig('tag', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Esta tag será adicionada ao contacto.</p>
                        </div>
                    )}

                    {node.config?.action === 'remove_tag' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Tag a Remover</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Lead Frio"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={node.config?.tag || ''}
                                onChange={(e) => updateConfig('tag', e.target.value)}
                            />
                        </div>
                    )}

                    {node.config?.action === 'send_email' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">ID da Campanha/Template</label>
                                <select 
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                    value={node.config.campaign_id || ''}
                                    onChange={(e) => updateConfig('campaign_id', e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="1">Boas Vindas (Exemplo)</option>
                                    <option value="2">Promoção Mensal (Exemplo)</option>
                                </select>
                            </div>
                            <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-md text-xs">
                                Nota: Em breve carregaremos as campanhas reais aqui.
                            </div>
                        </div>
                    )}

                    {node.type === 'delay' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Tempo de Espera (minutos)</label>
                            <input 
                                type="number" 
                                min="1"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={node.config?.minutes || 1}
                                onChange={(e) => updateConfig('minutes', parseInt(e.target.value))}
                            />
                        </div>
                    )}

                    <div className="pt-4 border-t border-border">
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full"
                            onClick={() => {
                                setNodes(nodes.filter(n => n.id !== selectedNode));
                                setSelectedNode(null);
                            }}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover Passo
                        </Button>
                    </div>
                </div>
            </div>
            );
        })()}
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium text-left"
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
      {label}
    </button>
  );
}

function getNodeIcon(type: string) {
    switch (type) {
        case 'trigger': return <Zap className="w-5 h-5" />;
        case 'action': return <Mail className="w-5 h-5" />;
        case 'delay': return <Clock className="w-5 h-5" />;
        case 'condition': return <Split className="w-5 h-5" />;
        default: return <Settings className="w-5 h-5" />;
    }
}