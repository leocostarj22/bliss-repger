import { useEffect, useState } from 'react';
import { fetchSegmentsFull, fetchSegmentEstimate, updateSegment, deleteSegment } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Edit2, RefreshCw } from 'lucide-react';

interface Segment {
  id: number | string;
  name: string;
  definition?: any;
  created_at?: string;
  updated_at?: string;
}

export default function Segments() {
  const { toast } = useToast();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [estimating, setEstimating] = useState<Record<string, boolean>>({});
  const [estimates, setEstimates] = useState<Record<string, number | null>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadSegments = async () => {
    setLoading(true);
    try {
      const res = await fetchSegmentsFull();
      setSegments(res.data);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os segmentos.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === segments.length && segments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(segments.map(s => String(s.id))));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Tem a certeza que deseja eliminar ${selectedIds.size} segmentos selecionados?`)) return;
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await deleteSegment(id);
      }
      setSegments(prev => prev.filter(s => !selectedIds.has(String(s.id))));
      setSelectedIds(new Set());
      toast({ title: 'Segmentos eliminados', description: 'Os segmentos selecionados foram removidos com sucesso.' });
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível eliminar todos os segmentos selecionados.' });
    }
  };

  useEffect(() => {
    loadSegments();
  }, []);

  const getTypeLabel = (segment: Segment) => {
    const def = segment.definition || {};
    if (Array.isArray(def.contact_ids) && def.contact_ids.length > 0) return 'Estático (IDs)';
    if (Array.isArray(def.filters) && def.filters.length > 0) return 'Dinâmico (Filtros)';
    return 'Legado';
  };

  const handleRename = (segment: Segment) => {
    setRenamingId(String(segment.id));
    setRenameValue(segment.name);
  };

  const handleRenameSave = async (segment: Segment) => {
    if (!renameValue.trim()) return;
    try {
      const res = await updateSegment(String(segment.id), { name: renameValue.trim() });
      setSegments(prev =>
        prev.map(s => (String(s.id) === String(segment.id) ? { ...s, name: res.data.name } : s)),
      );
      toast({ title: 'Segmento atualizado', description: 'O nome do segmento foi alterado.' });
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o segmento.' });
    } finally {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const handleDelete = async (segment: Segment) => {
    if (!confirm(`Tem a certeza que deseja eliminar o segmento "${segment.name}"?`)) return;
    try {
      await deleteSegment(String(segment.id));
      setSegments(prev => prev.filter(s => String(s.id) !== String(segment.id)));
      toast({ title: 'Segmento eliminado', description: 'O segmento foi removido com sucesso.' });
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível eliminar o segmento.' });
    }
  };

  const handleEstimate = async (segment: Segment) => {
    const id = String(segment.id);
    setEstimating(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetchSegmentEstimate(id);
      setEstimates(prev => ({ ...prev, [id]: res.data.estimated }));
    } catch {
      setEstimates(prev => ({ ...prev, [id]: null }));
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao calcular o total estimado.' });
    } finally {
      setEstimating(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <h1 className="page-title">Segmentos</h1>
          <p className="page-subtitle">
            Gerencie as listas e segmentos utilizados nas campanhas. Apague segmentos antigos e renomeie os atuais.
          </p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              className="gap-2 w-full sm:w-auto"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4" /> Apagar Selecionados
            </Button>
          )}
          <Button variant="outline" onClick={loadSegments} className="gap-2 w-full sm:w-auto hover:shadow-[0_0_14px_hsl(var(--ring)/0.14)]">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30">
              <tr className="border-b border-border">
                <th className="py-3 px-4 w-10">
                  <Checkbox
                    checked={segments.length > 0 && selectedIds.size === segments.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">
                  Tipo
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">
                  Criado em
                </th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total estimado</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 px-4">
                        <Skeleton className="h-5 w-48" />
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <Skeleton className="h-5 w-32" />
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <Skeleton className="h-5 w-32" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Skeleton className="h-5 w-16 ml-auto" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Skeleton className="h-5 w-20 ml-auto" />
                      </td>
                    </tr>
                  ))
                : segments.map(segment => {
                    const id = String(segment.id);
                    const estimate = estimates[id];

                    return (
                      <tr key={id} className="border-b border-border/50 table-row-hover">
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={selectedIds.has(id)}
                            onCheckedChange={() => toggleSelect(id)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          {renamingId === id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                className="h-8 max-w-xs"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRenameSave(segment)}
                              >
                                Guardar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRenamingId(null);
                                  setRenameValue('');
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium">{segment.name}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                          {getTypeLabel(segment)}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                          {segment.created_at
                            ? new Date(segment.created_at).toLocaleString()
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono">
                              {estimate === undefined ? '--' : estimate ?? '0'}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => handleEstimate(segment)}
                              disabled={!!estimating[id]}
                              title="Calcular total estimado"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${estimating[id] ? 'animate-spin' : ''}`}
                              />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => handleRename(segment)}
                              title="Renomear segmento"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => handleDelete(segment)}
                              title="Eliminar segmento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}