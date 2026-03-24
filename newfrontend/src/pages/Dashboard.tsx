import { useEffect, useMemo, useState, Fragment } from 'react';
import { addAdminPostComment, fetchAdminPostComments, fetchMainDashboard, toggleAdminPostLike, fetchAnalytics } from '@/services/api';
import type { AdminPostComment, MainDashboardData, DashboardStats } from '@/types';
import { Ticket, FolderOpen, BadgeCheck, Flame, TrendingUp, Clock, Mail, Send, FileText, Star, Users, LogIn, Heart, Loader2, MessageCircle } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn, getInitials, resolvePhotoUrl } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('pt-PT');
};

const plainTextFromHtml = (html: string) => {
  const raw = (html ?? '').toString();
  if (!raw.trim()) return '';

  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    return (doc.body.textContent ?? '').replace(/\u00A0/g, ' ').trim();
  } catch {
    return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

const sanitizeHtml = (html: string) => {
  const raw = (html ?? '').toString();
  if (!raw) return '';

  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    const remove = doc.querySelectorAll('script, style, iframe, object, embed');
    remove.forEach((n) => n.remove());

    doc.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value;
        if (name.startsWith('on')) el.removeAttribute(attr.name);
        if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) el.removeAttribute(attr.name);
        if (name === 'srcdoc') el.removeAttribute(attr.name);
      });
    });

    return doc.body.innerHTML;
  } catch {
    return raw;
  }
};

const statConfig = [
  { key: 'total', label: 'Total de Tickets', icon: Ticket, format: (v: number) => formatNumber(v), suffix: '' },
  { key: 'open_count', label: 'Tickets Abertos', icon: FolderOpen, format: (v: number) => formatNumber(v), suffix: '' },
  { key: 'resolved_count', label: 'Tickets Resolvidos', icon: BadgeCheck, format: (v: number) => formatNumber(v), suffix: '' },
  { key: 'urgent_count', label: 'Tickets Urgentes', icon: Flame, format: (v: number) => formatNumber(v), suffix: '' },
  { key: 'resolution_rate_30d', label: 'Taxa de Resolução', icon: TrendingUp, format: (v: number) => v.toFixed(1), suffix: '%' },
  { key: 'avg_time_formatted', label: 'Tempo Médio', icon: Clock, format: (v: string) => v, suffix: '' },
] as const;


const showLegacyEmailWidgets = true;

const CHART_COLORS = [
  'hsl(185, 65%, 48%)',
  'hsl(152, 60%, 45%)',
  'hsl(38, 90%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 68%, 52%)',
];

export default function Dashboard() {
  const { toast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<DashboardStats | null>(null);

  const [busyPostIds, setBusyPostIds] = useState<Record<string, boolean>>({});
  const [expandedPostIds, setExpandedPostIds] = useState<Record<string, boolean>>({});

  const [commentsOpenIds, setCommentsOpenIds] = useState<Record<string, boolean>>({});
  const [commentsLoadingIds, setCommentsLoadingIds] = useState<Record<string, boolean>>({});
  const [commentPostingIds, setCommentPostingIds] = useState<Record<string, boolean>>({});
  const [commentDraftByPostId, setCommentDraftByPostId] = useState<Record<string, string>>({});
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, AdminPostComment[]>>({});

  const dashboard = stats as MainDashboardData | null;
  const posts = useMemo(() => (Array.isArray(dashboard?.posts) ? dashboard!.posts : []), [dashboard]);
  const dailyMetrics = Array.isArray(analytics?.dailyMetrics)
    ? analytics!.dailyMetrics
    : (Array.isArray((dashboard as any)?.dailyMetrics)
      ? (dashboard as any).dailyMetrics
      : (Array.isArray((stats as any)?.dailyMetrics) ? (stats as any).dailyMetrics : []));
  const topCampaigns = Array.isArray(analytics?.topCampaigns)
    ? analytics!.topCampaigns
    : (Array.isArray((dashboard as any)?.topCampaigns)
      ? (dashboard as any).topCampaigns
      : (Array.isArray((stats as any)?.topCampaigns) ? (stats as any).topCampaigns : []));
  const heatData = Array.isArray(analytics?.heatmapData)
    ? analytics!.heatmapData
    : (Array.isArray((dashboard as any)?.heatmapData)
      ? (dashboard as any).heatmapData
      : (Array.isArray((stats as any)?.heatmapData) ? (stats as any).heatmapData : []));

  const onToggleLike = async (postId: string) => {
    setBusyPostIds((m) => ({ ...m, [postId]: true }));
    try {
      const resp = await toggleAdminPostLike(postId);
      setStats((prev: any) => {
        if (!prev || !Array.isArray(prev.posts)) return prev;
        return {
          ...prev,
          posts: prev.posts.map((p: any) => (String(p.id) === String(postId) ? resp.data : p)),
        };
      });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o like', variant: 'destructive' });
    } finally {
      setBusyPostIds((m) => ({ ...m, [postId]: false }));
    }
  };

  const loadComments = async (postId: string) => {
    if (commentsLoadingIds[postId]) return;
    setCommentsLoadingIds((m) => ({ ...m, [postId]: true }));
    try {
      const resp = await fetchAdminPostComments(postId);
      setCommentsByPostId((m) => ({ ...m, [postId]: resp.data }));
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar comentários', variant: 'destructive' });
    } finally {
      setCommentsLoadingIds((m) => ({ ...m, [postId]: false }));
    }
  };

  const onToggleComments = (postId: string) => {
    const willOpen = !commentsOpenIds[postId];
    setCommentsOpenIds((m) => ({ ...m, [postId]: willOpen }));
    if (willOpen && commentsByPostId[postId] === undefined) {
      void loadComments(postId);
    }
  };

  const onAddComment = async (postId: string) => {
    const content = (commentDraftByPostId[postId] ?? '').trim();
    if (!content) return;

    setCommentPostingIds((m) => ({ ...m, [postId]: true }));
    try {
      const resp = await addAdminPostComment(postId, { content });
      setCommentsByPostId((m) => ({
        ...m,
        [postId]: [...(m[postId] ?? []), resp.data],
      }));
      setCommentDraftByPostId((m) => ({ ...m, [postId]: '' }));
      setCommentsOpenIds((m) => ({ ...m, [postId]: true }));
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ? String(e.message) : 'Não foi possível enviar o comentário', variant: 'destructive' });
    } finally {
      setCommentPostingIds((m) => ({ ...m, [postId]: false }));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchMainDashboard();
        setStats(r.data);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : 'Não foi possível carregar a dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchAnalytics();
        setAnalytics(r.data);
      } catch {}
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header lg:col-span-3 order-0">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumo de suporte, mensagens e comunicados</p>
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

  if (error || !dashboard) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumo de suporte, mensagens e comunicados</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"></div>
        </div>
        <div className="glass-card p-6">
          <div className="text-sm font-medium">Não foi possível carregar dados reais</div>
          <div className="mt-1 text-xs text-muted-foreground">{error ?? 'Sem resposta do servidor'}</div>
          <div className="mt-4 text-xs text-muted-foreground">Confirma que o backend Laravel está a correr e que o proxy do frontend aponta para o porto correto.</div>
        </div>
      </div>
    );
  }

  const maxHeat = Math.max(1, ...(heatData.map((d: any) => Number(d?.value) || 0)));

  const activity = (dashboard as any)?.activity ?? null;
  const onlineUsers = Number(activity?.online_users ?? 0);
  const accessesToday = Number(activity?.accesses_today ?? 0);
  const onlineWindowMinutes = Number(activity?.online_window_minutes ?? 15);

  const unread = Number(dashboard.messages?.unread ?? 0);

  const messageCards = [
    {
      key: 'unread',
      label: 'Não lidas',
      icon: Mail,
      value: unread,
      to: '/communication/messages',
      tone: 'rose',
      meta: unread > 0 ? 'Novas mensagens' : 'Caixa de entrada',
    },
    {
      key: 'sent_this_month',
      label: 'Enviadas',
      icon: Send,
      value: Number((dashboard.messages as any)?.sent_this_month ?? 0),
      to: '/communication/messages',
      tone: 'cyan',
      meta: 'Este mês',
    },
    {
      key: 'drafts',
      label: 'Rascunhos',
      icon: FileText,
      value: Number((dashboard.messages as any)?.drafts ?? 0),
      to: '/communication/messages',
      tone: 'amber',
      meta: 'Por enviar',
    },
    {
      key: 'starred',
      label: 'Com estrela',
      icon: Star,
      value: Number((dashboard.messages as any)?.starred ?? 0),
      to: '/communication/messages',
      tone: 'fuchsia',
      meta: 'Importantes',
    },
    {
      key: 'online_users',
      label: 'Utilizadores online',
      icon: Users,
      value: onlineUsers,
      to: '/admin/users',
      tone: 'emerald',
      meta: `Últimos ${onlineWindowMinutes} min`,
    },
    {
      key: 'accesses_today',
      label: 'Acessos hoje',
      icon: LogIn,
      value: accessesToday,
      to: '/reports/system-logs',
      tone: 'violet',
      meta: 'Atividade do dia',
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumo de suporte, mensagens e comunicados</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"></div>
      </div>

      {/* KPI Cards */}
      <div className="order-1 lg:col-span-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statConfig.map((s, i) => {
          const raw = (dashboard.tickets as any)[s.key];

          let formatted: string;
          if (s.key === 'avg_time_formatted') {
            formatted = s.format(String(raw ?? 'N/A'));
          } else {
            formatted = s.format(Number.isFinite(Number(raw)) ? Number(raw) : 0);
          }

          return (
            <Link
              to="/support/tickets"
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
                {formatted}{s.suffix}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="order-2 lg:col-span-3">
        <div className="glass-card p-6 bg-gradient-to-b from-cyan-500/5 via-background to-background border-t-cyan-500/20 hover:shadow-[0_0_30px_hsl(var(--ring)/0.25)] hover:border-cyan-400/40 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold">Mensagens</h3>
              <p className="text-xs text-muted-foreground">{dashboard.messages.month_label}</p>
            </div>

            <div className="flex items-center gap-2">
              {unread > 0 ? (
                <Badge className="border border-rose-500/30 bg-rose-500/15 text-rose-300">
                  {unread === 1 ? '1 nova' : `${formatNumber(unread)} novas`}
                </Badge>
              ) : null}
              <Button variant="outline" size="sm" asChild>
                <Link to="/communication/messages">Abrir</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {messageCards.map((c, i) => {
              const Icon = c.icon;
              const isUnread = c.key === 'unread';
              const emphasize = isUnread && unread > 0;

              const tone = c.tone;
              const toneClasses =
                tone === 'rose'
                  ? 'group-hover:from-rose-400 group-hover:to-orange-400'
                  : tone === 'cyan'
                    ? 'group-hover:from-cyan-400 group-hover:to-sky-400'
                    : tone === 'amber'
                      ? 'group-hover:from-amber-400 group-hover:to-yellow-400'
                      : tone === 'fuchsia'
                        ? 'group-hover:from-fuchsia-400 group-hover:to-pink-400'
                        : tone === 'emerald'
                          ? 'group-hover:from-emerald-400 group-hover:to-teal-400'
                          : 'group-hover:from-violet-400 group-hover:to-indigo-400';

              const iconTone =
                tone === 'rose'
                  ? 'text-rose-400'
                  : tone === 'cyan'
                    ? 'text-cyan-400'
                    : tone === 'amber'
                      ? 'text-amber-400'
                      : tone === 'fuchsia'
                        ? 'text-fuchsia-400'
                        : tone === 'emerald'
                          ? 'text-emerald-400'
                          : 'text-violet-400';

              return (
                <Link
                  key={c.key}
                  to={c.to}
                  className={cn(
                    'group stat-card relative overflow-hidden animate-fade-in hover:shadow-[0_0_30px_hsl(var(--ring)/0.25)] transition-all duration-300 hover:-translate-y-1',
                    emphasize && 'ring-1 ring-rose-400/40 border-rose-400/30 shadow-[0_0_25px_rgba(244,63,94,0.18)]'
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl transition-all duration-500" />

                  {emphasize ? (
                    <>
                      <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-rose-400" />
                      <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-rose-400 animate-ping" />
                    </>
                  ) : null}

                  <div className="relative z-10 flex items-center gap-3 mb-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20 ring-1 ring-white/10 shadow-sm transition-all duration-300">
                      <Icon className={cn('w-5 h-5 transition-transform duration-300 group-hover:scale-110', iconTone)} />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{c.label}</span>
                  </div>

                  <div className={cn('relative z-10 text-2xl font-bold tracking-tight animate-count bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 transition-all duration-300', toneClasses)}>
                    {formatNumber(c.value)}
                  </div>
                  <div className="relative z-10 mt-1 text-[11px] text-muted-foreground">{c.meta}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {showLegacyEmailWidgets ? (
        <>
          {/* Charts */}
          <div className="order-5 lg:col-span-1 grid grid-cols-1 gap-6">
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
            <AreaChart data={dailyMetrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          {dailyMetrics.length === 0 && (
            <div className="mt-2 text-xs text-muted-foreground">Sem dados disponíveis.</div>
          )}
        </div>

        {/* Top Campaigns */}
        <div className="glass-card p-6 bg-gradient-to-b from-fuchsia-500/5 via-background to-background border-t-fuchsia-500/20 hover:shadow-[0_0_30px_hsl(var(--ring)/0.25)] hover:border-fuchsia-400/40 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold">Top Campaigns</h3>
              <p className="text-xs text-muted-foreground">By open rate performance</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCampaigns} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={24}>
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
                {topCampaigns.map((_, i) => (
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
          {topCampaigns.length === 0 && (
            <div className="mt-2 text-xs text-muted-foreground">Sem dados disponíveis.</div>
          )}
        </div>
      </div>


        </>
      ) : null}

      <div className="order-4 lg:col-span-2 glass-card p-6 bg-gradient-to-b from-fuchsia-500/5 via-background to-background border-t-fuchsia-500/20 hover:shadow-[0_0_30px_hsl(var(--ring)/0.25)] hover:border-fuchsia-400/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold">Posts Administrativos</h3>
            <p className="text-xs text-muted-foreground">Últimos comunicados</p>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem posts.</div>
        ) : (
          <ScrollArea className="h-[600px] pr-3">
          <div className="relative space-y-4">
            <div className="absolute left-5 top-2 bottom-2 w-px bg-border/60" />
            {posts.slice(0, 10).map((p) => {
              const busy = !!busyPostIds[p.id];
              const expanded = !!expandedPostIds[p.id];

              const title = (p.title ?? '').trim() || 'Sem título';
              const author = p.author?.name ?? 'Sistema';
              const when = p.published_at ?? null;

              const fullHtml = (p.content ?? '').toString();
              const safeHtml = sanitizeHtml(fullHtml);
              const text = plainTextFromHtml(fullHtml);
              const tooLong = text.length > 420;

              return (
                <div key={p.id} className="relative rounded-lg border border-border/60 bg-background/40 p-4 pl-10">
                  <span className="absolute left-4 top-6 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar className="w-9 h-9 border border-border">
                        <AvatarImage src={resolvePhotoUrl(p.author?.photo_path ?? null) ?? undefined} alt={p.author?.name ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {getInitials(p.author?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-sm font-medium truncate">{p.author?.name ?? 'Sistema'}</div>
                          {p.is_pinned ? <Badge variant="secondary">Fixado</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(p.title ?? '').trim() ? <span className="font-medium">{title}</span> : null}
                          {(p.title ?? '').trim() && when ? <span> • </span> : null}
                          {when ? fmtDateTime(when) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {safeHtml ? (
                    <div
                      className={cn(
                        'mt-3 text-sm tiptap ProseMirror min-h-0 p-0',
                        !expanded && tooLong && 'max-h-40 overflow-hidden'
                      )}
                      dangerouslySetInnerHTML={{ __html: safeHtml }}
                    />
                  ) : null}

                  {tooLong ? (
                    <button
                      className="mt-2 text-xs text-primary hover:underline"
                      onClick={() => setExpandedPostIds((m) => ({ ...m, [p.id]: !expanded }))}
                    >
                      {expanded ? 'Ver menos' : 'Ver mais'}
                    </button>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => onToggleLike(p.id)}
                      className={cn(p.liked_by_me && 'border-rose-500/40 text-rose-600')}
                    >
                      {busy ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Heart className={cn('w-4 h-4 mr-2', p.liked_by_me && 'fill-rose-500 text-rose-500')} />
                      )}
                      {p.likes_count}
                    </Button>

                    <Button variant="outline" size="sm" onClick={() => onToggleComments(p.id)}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Comentários
                    </Button>
                  </div>

                  {commentsOpenIds[p.id] ? (
                    <div className="mt-3 rounded-md border border-border/60 bg-background/30 p-3 space-y-3">
                      {commentsLoadingIds[p.id] ? (
                        <div className="text-xs text-muted-foreground">A carregar comentários…</div>
                      ) : (commentsByPostId[p.id] ?? []).length ? (
                        <div className="space-y-3">
                          {(commentsByPostId[p.id] ?? []).map((c) => (
                            <div key={c.id} className="flex items-start gap-3">
                              <Avatar className="w-8 h-8 border border-border">
                                <AvatarImage src={resolvePhotoUrl(c.user?.photo_path ?? null) ?? undefined} alt={c.user?.name ?? undefined} />
                                <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
                                  {getInitials(c.user?.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{c.user?.name ?? 'Utilizador'}</span>
                                  {c.createdAt ? <span> • {fmtDateTime(c.createdAt)}</span> : null}
                                </div>
                                <div className="text-sm whitespace-pre-wrap break-words">{c.content}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Sem comentários.</div>
                      )}

                      <div className="flex gap-2">
                        <Textarea
                          rows={2}
                          value={commentDraftByPostId[p.id] ?? ''}
                          onChange={(e) => setCommentDraftByPostId((m) => ({ ...m, [p.id]: e.target.value }))}
                          placeholder="Escreva um comentário…"
                          className="min-h-0"
                        />
                        <Button
                          type="button"
                          onClick={() => onAddComment(p.id)}
                          disabled={commentPostingIds[p.id] || !(commentDraftByPostId[p.id] ?? '').trim()}
                        >
                          {commentPostingIds[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          </ScrollArea>
        )}
      </div>

      <div className="order-6 lg:col-span-3 glass-card p-6 bg-gradient-to-b from-violet-500/5 via-background to-background border-t-violet-500/20 hover:shadow-[0_0_30px_hsl(var(--ring)/0.25)] hover:border-violet-400/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold">Heatmap de Atividade</h3>
            <p className="text-xs text-muted-foreground">Informações relevantes do GMCentral por dia e hora</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
            <span>Menos</span>
            <div className="h-2 w-24 rounded-full" style={{ background: 'linear-gradient(to right, rgba(34,211,238,0.1), #22d3ee)' }} />
            <span>Mais</span>
          </div>
        </div>
        <ScrollArea className="pb-2 w-full">
          {heatData.length === 0 ? (
            <div className="text-xs text-muted-foreground">Sem dados para heatmap.</div>
          ) : (
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `60px repeat(24, 1fr)`, minWidth: '800px' }}>
            <div key="header-empty" />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={`header-${h}`} className="text-[10px] text-muted-foreground text-center font-medium">{h}h</div>
            ))}
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, di) => (
              <Fragment key={day}>
                <div className="text-xs text-muted-foreground flex items-center font-medium">{day}</div>
                {Array.from({ length: 24 }, (_, h) => {
                  const val = heatData.find((d: any) => ((d.day + 6) % 7) === di && d.hour === h)?.value ?? 0;
                  const opacity = Math.max(0.05, val / maxHeat);
                  return (
                    <div
                      key={`${di}-${h}`}
                      className="aspect-square rounded-[2px] transition-all duration-300 hover:scale-125 hover:z-10 relative group"
                      style={{ 
                        backgroundColor: `rgba(34, 211, 238, ${opacity})`,
                        boxShadow: val > 0 ? `0 0 ${opacity * 10}px rgba(34, 211, 238, ${opacity * 0.5})` : 'none'
                      }}
                    >
                      {val > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 border border-border">
                          {val} eventos
                        </div>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          )}
        </ScrollArea>
      </div>

    </div>
  );
}
