import { useEffect, useState, Fragment } from 'react';
import { fetchDashboard } from '@/services/api';
import type { DashboardStats } from '@/types';
import { Mail, MousePointerClick, Eye, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

const statConfig = [
  { key: 'totalSent', label: 'Emails Sent', icon: Mail, format: formatNumber, suffix: '' },
  { key: 'openRate', label: 'Open Rate', icon: Eye, format: (n: number) => n.toFixed(1), suffix: '%' },
  { key: 'clickRate', label: 'Click Rate', icon: MousePointerClick, format: (n: number) => n.toFixed(1), suffix: '%' },
  { key: 'bounceRate', label: 'Bounce Rate', icon: AlertTriangle, format: (n: number) => n.toFixed(1), suffix: '%' },
  { key: 'totalContacts', label: 'Total Contacts', icon: Users, format: formatNumber, suffix: '' },
  { key: 'contactGrowth', label: 'Growth', icon: TrendingUp, format: (n: number) => '+' + n.toFixed(1), suffix: '%' },
] as const;

const CHART_COLORS = [
  'hsl(185, 65%, 48%)',
  'hsl(152, 60%, 45%)',
  'hsl(38, 90%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 68%, 52%)',
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const heatmapDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

  useEffect(() => {
    fetchDashboard().then(r => { setStats(r.data); setLoading(false); });
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your email marketing performance</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="stat-card space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  const maxHeat = Math.max(1, ...stats.heatmapData.map(d => d.value));

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your email marketing performance</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statConfig.map((s, i) => {
          const value = stats[s.key as keyof DashboardStats] as number;
          return (
            <div
              key={s.key}
              className="group stat-card relative overflow-hidden animate-fade-in hover:shadow-[0_0_30px_hsl(var(--ring)/0.25)] hover:border-cyan-400/40 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl group-hover:from-cyan-400/20 transition-all duration-500" />
              
              <div className="relative z-10 flex items-center gap-3 mb-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20 ring-1 ring-white/10 group-hover:ring-cyan-400/50 shadow-sm group-hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300">
                  <s.icon className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                </span>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{s.label}</span>
              </div>
              
              <div className="relative z-10 text-2xl font-bold tracking-tight animate-count bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 group-hover:from-cyan-400 group-hover:to-fuchsia-400 transition-all duration-300">
                {s.format(value)}{s.suffix}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Performance Over Time */}
        <div className="glass-card p-6 bg-gradient-to-b from-cyan-500/5 via-background to-background border-t-cyan-500/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold">Email Performance</h3>
              <p className="text-xs text-muted-foreground">Last 30 days activity</p>
            </div>
            <div className="flex gap-2">
               <span className="flex items-center text-xs text-cyan-400"><div className="w-2 h-2 rounded-full bg-cyan-400 mr-1 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div> Sent</span>
               <span className="flex items-center text-xs text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-400 mr-1 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Opened</span>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.dailyMetrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={v => v.slice(5)}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(8px)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: '#f8fafc',
                  borderRadius: '12px',
                  fontSize: 12,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ padding: 0 }}
                labelStyle={{ marginBottom: '8px', color: '#94a3b8' }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="sent" 
                stroke="#22d3ee" 
                fill="url(#gradSent)" 
                strokeWidth={2}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#22d3ee', filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.5))' }}
              />
              <Area 
                type="monotone" 
                dataKey="opened" 
                stroke="#10b981" 
                fill="url(#gradOpened)" 
                strokeWidth={2}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981', filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.5))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Campaigns */}
        <div className="glass-card p-6 bg-gradient-to-b from-fuchsia-500/5 via-background to-background border-t-fuchsia-500/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold">Top Campaigns</h3>
              <p className="text-xs text-muted-foreground">By open rate performance</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topCampaigns} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              <YAxis
                dataKey="campaignName"
                type="category"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--foreground) / 0.03)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover) / 0.95)',
                  backdropFilter: 'blur(8px)',
                  borderColor: 'hsl(var(--border) / 0.9)',
                  color: 'hsl(var(--popover-foreground))',
                  borderRadius: '12px',
                  fontSize: 12,
                  boxShadow: '0 10px 30px hsl(var(--foreground) / 0.12)',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '6px' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Bar dataKey="opened" radius={[0, 4, 4, 0]}>
                {stats.topCampaigns.map((_, i) => (
                  <Cell 
                    key={i} 
                    fill={CHART_COLORS[i % CHART_COLORS.length]} 
                    className="hover:opacity-80 transition-opacity"
                    filter={`drop-shadow(0 0 4px ${CHART_COLORS[i % CHART_COLORS.length]}80)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="glass-card p-6 bg-gradient-to-b from-violet-500/5 via-background to-background border-t-violet-500/20 relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold">Mapa de Atividade</h3>
            <p className="text-xs text-muted-foreground">Aberturas por dia e hora</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
            <span>Menos</span>
            <div className="h-2 w-24 rounded-full" style={{ background: 'linear-gradient(to right, rgba(34,211,238,0.08), #22d3ee)' }} />
            <span>Mais</span>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible pb-2 pt-2">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `60px repeat(24, 1fr)`, minWidth: '800px' }}>
            <div key="header-empty" />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={`header-${h}`} className="text-[10px] text-muted-foreground text-center font-medium">{h}h</div>
            ))}

            {heatmapDays.map((day, di) => (
              <Fragment key={day}>
                <div className="text-xs text-muted-foreground flex items-center font-medium">{day}</div>
                {Array.from({ length: 24 }, (_, h) => {
                  const val = stats.heatmapData.find(d => ((d.day + 6) % 7) === di && d.hour === h)?.value ?? 0;
                  const opacity = Math.max(0.05, val / maxHeat);

                  return (
                    <div
                      key={`${di}-${h}`}
                      className="group aspect-square rounded-[2px] transition-all duration-200 hover:scale-110 hover:z-20 relative"
                      style={{
                        backgroundColor: `rgba(34, 211, 238, ${opacity})`,
                        boxShadow: val > 0 ? `0 0 ${opacity * 10}px rgba(34, 211, 238, ${opacity * 0.5})` : 'none',
                      }}
                    >
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-1/2 mt-1 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 pointer-events-none whitespace-nowrap z-30">
                        <div className="rounded-md border border-border/80 bg-popover/95 text-popover-foreground backdrop-blur-md px-2.5 py-1.5 shadow-lg">
                          <div className="text-[11px] font-semibold">
                            {day}, {formatHour(h)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Aberturas: <span className="text-foreground font-semibold">{val}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
