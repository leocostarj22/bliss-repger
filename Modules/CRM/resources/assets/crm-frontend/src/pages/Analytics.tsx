import { useEffect, useState } from 'react';
import { fetchAnalytics } from '@/services/api';
import type { DashboardStats } from '@/types';
import { Download, Calendar } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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

export default function Analytics() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics()
      .then(r => {
        setData(r.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load analytics, using mock data:', err);
        // Fallback to mock data to prevent crash
        import('@/services/mockData').then(m => {
          setData(m.mockDashboardStats);
          setLoading(false);
        });
      });
  }, []);

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

  const pieData = [
    { name: 'Aberto', value: data.openRate },
    { name: 'Clicado', value: data.clickRate },
    { name: 'Rejeitado', value: data.bounceRate },
    { name: 'Ignorado', value: Math.max(0, 100 - data.openRate - data.clickRate - data.bounceRate) },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Analítica</h1>
          <p className="page-subtitle">Análise detalhada do desempenho dos seus emails</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" /> Últimos 30 dias
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Desempenho de Entrega</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 18%, 18%)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(215, 12%, 52%)' }}
                tickFormatter={v => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(215, 12%, 52%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f8f9fa',
                  borderColor: '#e5e7eb',
                  color: '#1f2937',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
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
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Detalhamento de Engajamento</h3>
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
                  backgroundColor: '#f8f9fa',
                  borderColor: '#e5e7eb',
                  color: '#1f2937',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
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
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">Comparação de Campanhas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campanha</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Enviado</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Aberto</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Clicado</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Rejeitado</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Taxa de Abertura</th>
              </tr>
            </thead>
            <tbody>
              {data.topCampaigns.map(c => (
                <tr key={c.campaignId} className="border-b border-border/50 table-row-hover">
                  <td className="py-3 px-4 font-medium">{c.campaignName}</td>
                  <td className="py-3 px-4 text-right font-mono">{c.sent.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono">{c.opened.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono">{c.clicked.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono">{c.bounced.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono text-primary">{((c.opened / c.sent) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
