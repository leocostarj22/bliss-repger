import { useEffect, useMemo, useState } from 'react';
import { fetchAnalytics } from '@/services/api';
import type { DashboardStats } from '@/types';
import { Download, Calendar } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const COLORS = [
  'hsl(185, 65%, 48%)',
  'hsl(152, 60%, 45%)',
  'hsl(38, 90%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 68%, 52%)',
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function escapeCsvValue(value: unknown): string {
  const s = String(value ?? '');
  const escaped = s.replace(/"/g, '""');
  if (/[\n\r",;]/.test(escaped)) return `"${escaped}"`;
  return escaped;
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Analytics() {
  const { toast } = useToast();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const selectedCampaign = useMemo(() => {
    return data?.topCampaigns.find(c => c.campaignId === selectedCampaignId) ?? null;
  }, [data?.topCampaigns, selectedCampaignId]);

  const load = async (nextDays: number) => {
    try {
      if (data) setRefreshing(true);
      else setLoading(true);

      const r = await fetchAnalytics({ days: nextDays });
      setData(r.data);
    } catch (err) {
      console.error('Failed to load analytics, using mock data:', err);
      const m = await import('@/services/mockData');
      const mock = m.mockDashboardStats;
      setData({
        ...mock,
        dailyMetrics: Array.isArray(mock.dailyMetrics) ? mock.dailyMetrics.slice(-nextDays) : [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const pieData = useMemo(() => {
    if (selectedCampaign) {
      const openRate = selectedCampaign.sent > 0 ? (selectedCampaign.opened / selectedCampaign.sent) * 100 : 0;
      const clickRate = selectedCampaign.sent > 0 ? (selectedCampaign.clicked / selectedCampaign.sent) * 100 : 0;
      const bounceRate = selectedCampaign.sent > 0 ? (selectedCampaign.bounced / selectedCampaign.sent) * 100 : 0;
      return [
        { name: 'Aberto', value: openRate },
        { name: 'Clicado', value: clickRate },
        { name: 'Rejeitado', value: bounceRate },
        { name: 'Ignorado', value: Math.max(0, 100 - openRate - clickRate - bounceRate) },
      ];
    }
    const openRate = data?.openRate ?? 0;
    const clickRate = data?.clickRate ?? 0;
    const bounceRate = data?.bounceRate ?? 0;
    return [
      { name: 'Aberto', value: openRate },
      { name: 'Clicado', value: clickRate },
      { name: 'Rejeitado', value: bounceRate },
      { name: 'Ignorado', value: Math.max(0, 100 - openRate - clickRate - bounceRate) },
    ];
  }, [data?.bounceRate, data?.clickRate, data?.openRate, selectedCampaign]);

  useEffect(() => {
    load(days);
  }, [days]);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Analítica</h1>
          <p className="page-subtitle">Análise detalhada do desempenho dos seus emails</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  const handleExportCsv = async () => {
    try {
      setExporting(true);

      const today = new Date().toISOString().slice(0, 10);
      const filename = `crm-analytics-${days}d-${today}.csv`;

      const lines: string[] = [];
      lines.push(['periodo', `ultimos_${days}_dias`].map(escapeCsvValue).join(','));
      lines.push('');

      lines.push(['resumo', 'valor'].map(escapeCsvValue).join(','));
      lines.push(['total_sent', data.totalSent].map(escapeCsvValue).join(','));
      lines.push(['open_rate', `${data.openRate.toFixed(1)}%`].map(escapeCsvValue).join(','));
      lines.push(['click_rate', `${data.clickRate.toFixed(1)}%`].map(escapeCsvValue).join(','));
      lines.push(['bounce_rate', `${data.bounceRate.toFixed(1)}%`].map(escapeCsvValue).join(','));
      lines.push('');

      lines.push(['date', 'sent', 'opened', 'clicked', 'bounced'].map(escapeCsvValue).join(','));
      for (const row of data.dailyMetrics) {
        lines.push([
          row.date,
          row.sent,
          row.opened,
          row.clicked,
          row.bounced,
        ].map(escapeCsvValue).join(','));
      }

      lines.push('');
      lines.push(['campaign_id', 'campaign_name', 'sent', 'opened', 'clicked', 'bounced', 'open_rate'].map(escapeCsvValue).join(','));
      for (const c of data.topCampaigns) {
        const openRate = c.sent > 0 ? (c.opened / c.sent) * 100 : 0;
        lines.push([
          c.campaignId,
          c.campaignName,
          c.sent,
          c.opened,
          c.clicked,
          c.bounced,
          `${openRate.toFixed(1)}%`,
        ].map(escapeCsvValue).join(','));
      }

      downloadCsv(filename, lines.join('\n'));
      toast({ title: 'CSV exportado', description: `Ficheiro ${filename} descarregado.` });
    } catch {
      toast({ title: 'Falha ao exportar CSV', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <h1 className="page-title">Analítica</h1>
          <p className="page-subtitle">Análise detalhada do desempenho dos seus emails</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto" disabled={refreshing}>
                <Calendar className="w-4 h-4" /> Últimos {days} dias
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[7, 30, 90].map((d) => (
                <DropdownMenuItem key={d} onClick={() => setDays(d as 7 | 30 | 90)}>
                  Últimos {d} dias
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            onClick={handleExportCsv}
            disabled={refreshing || exporting}
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="glass-card p-6 lg:col-span-2 bg-gradient-to-b from-cyan-500/5 via-background to-background border-t border-cyan-500/20">
          <h3 className="text-sm font-semibold mb-2">Desempenho de Entrega</h3>
          <div className="h-1 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4" />
          {selectedCampaign && (
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Enviado</div><div className="font-semibold font-mono">{selectedCampaign.sent.toLocaleString()}</div></div>
              <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Aberto</div><div className="font-semibold font-mono">{selectedCampaign.opened.toLocaleString()}</div></div>
              <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Clicado</div><div className="font-semibold font-mono">{selectedCampaign.clicked.toLocaleString()}</div></div>
              <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Rejeitado</div><div className="font-semibold font-mono">{selectedCampaign.bounced.toLocaleString()}</div></div>
              <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Abertura</div><div className="font-semibold font-mono">{(selectedCampaign.sent > 0 ? (selectedCampaign.opened / selectedCampaign.sent) * 100 : 0).toFixed(1)}%</div></div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.6)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={v => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border) / 0.8)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover) / 0.95)',
                  borderColor: 'hsl(var(--border) / 0.9)',
                  color: 'hsl(var(--popover-foreground))',
                  borderRadius: '12px',
                  fontSize: 12,
                  boxShadow: '0 10px 30px hsl(var(--foreground) / 0.12)',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Legend />
              <Line type="monotone" name="Enviado" dataKey="sent" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" name="Aberto" dataKey="opened" stroke={COLORS[1]} strokeWidth={2} dot={false} />
              <Line type="monotone" name="Clicado" dataKey="clicked" stroke={COLORS[2]} strokeWidth={2} dot={false} />
              <Line type="monotone" name="Rejeitado" dataKey="bounced" stroke={COLORS[4]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6 bg-gradient-to-b from-fuchsia-500/5 via-background to-background border-t border-fuchsia-500/20">
          <h3 className="text-sm font-semibold mb-2">Detalhamento de Engajamento</h3>
          <div className="h-1 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4" />
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover) / 0.95)',
                  borderColor: 'hsl(var(--border) / 0.9)',
                  color: 'hsl(var(--popover-foreground))',
                  borderRadius: '12px',
                  fontSize: 12,
                  boxShadow: '0 10px 30px hsl(var(--foreground) / 0.12)',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {pieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-mono font-medium">{entry.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign Comparison */}
      <div className="glass-card p-6 bg-gradient-to-b from-primary/5 via-background to-background">
        <h3 className="text-sm font-semibold mb-2">Comparação de Campanhas</h3>
        <div className="h-1 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4" />
        <div className="max-h-96 overflow-y-auto pr-1">
          <div className="divide-y divide-border rounded-md border">
            {data.topCampaigns.map(c => {
              const rate = c.sent > 0 ? (c.opened / c.sent) * 100 : 0;
              const active = selectedCampaignId === c.campaignId;
              return (
                <button
                  key={c.campaignId}
                  onClick={() => setSelectedCampaignId(active ? null : c.campaignId)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/50 transition-colors',
                    active && 'bg-primary/5 ring-1 ring-primary/30'
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.campaignName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Enviado {c.sent.toLocaleString()} • Aberto {c.opened.toLocaleString()} • Clique {c.clicked.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{rate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">abertura</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
