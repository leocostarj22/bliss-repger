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

  useEffect(() => {
    fetchDashboard().then(r => { setStats(r.data); setLoading(false); });
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your email marketing performance</p>
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

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your email marketing performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statConfig.map((s, i) => {
          const value = stats[s.key as keyof DashboardStats] as number;
          return (
            <div key={s.key} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <s.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight animate-count">
                {s.format(value)}{s.suffix}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Performance Over Time */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Email Performance (30 days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.dailyMetrics}>
              <defs>
                <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(185, 65%, 48%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(185, 65%, 48%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(152, 60%, 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(152, 60%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area type="monotone" dataKey="sent" stroke="hsl(185, 65%, 48%)" fill="url(#gradSent)" strokeWidth={2} />
              <Area type="monotone" dataKey="opened" stroke="hsl(152, 60%, 45%)" fill="url(#gradOpened)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Campaigns */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Top Campaigns by Opens</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.topCampaigns} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 18%, 18%)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'hsl(215, 12%, 52%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              <YAxis
                dataKey="campaignName"
                type="category"
                tick={{ fontSize: 11, fill: 'hsl(215, 12%, 52%)' }}
                axisLine={false}
                tickLine={false}
                width={120}
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
              <Bar dataKey="opened" radius={[0, 4, 4, 0]}>
                {stats.topCampaigns.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">Activity Heatmap (Opens by Day & Hour)</h3>
        <div className="overflow-x-auto">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `60px repeat(24, 1fr)`, minWidth: '700px' }}>
            {/* Header */}
            <div key="header-empty" />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={`header-${h}`} className="text-[10px] text-muted-foreground text-center">{h}h</div>
            ))}
            {/* Rows */}
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, di) => (
              <Fragment key={day}>
                <div className="text-xs text-muted-foreground flex items-center">{day}</div>
                {Array.from({ length: 24 }, (_, h) => {
                  const val = stats.heatmapData.find(d => d.day === di && d.hour === h)?.value ?? 0;
                  const opacity = Math.max(0.08, val / 100);
                  return (
                    <div
                      key={`${di}-${h}`}
                      className="aspect-square rounded-sm transition-colors"
                      style={{ backgroundColor: `hsl(185, 65%, 48%, ${opacity})` }}
                      title={`${day} ${h}:00 — ${val}%`}
                    />
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
