import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchAnalytics, fetchCampaigns } from '@/services/api';
import type { DashboardStats, Campaign } from '@/types';
import { Download, Calendar, Printer } from 'lucide-react';
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

function computeTotals(rows: { sent: number; opened: number; clicked: number; bounced: number }[]) {
  return rows.reduce((acc, r) => ({
    sent: acc.sent + (r.sent || 0),
    opened: acc.opened + (r.opened || 0),
    clicked: acc.clicked + (r.clicked || 0),
    bounced: acc.bounced + (r.bounced || 0),
  }), { sent: 0, opened: 0, clicked: 0, bounced: 0 });
}

function computeCompare(curr: any[], prev: any[]) {
  return { current: computeTotals(curr), prev: computeTotals(prev) };
}

export default function Analytics() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const lastWrittenSearch = useRef<string>('');

  const [days, setDays] = useState<7 | 14 | 30 | 90>(30);
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [campaignList, setCampaignList] = useState<Campaign[]>([]);
  const [seriesMetrics, setSeriesMetrics] = useState<DashboardStats['dailyMetrics'] | null>(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Record<string, DashboardStats['dailyMetrics']>>({});
  const [avgSeries, setAvgSeries] = useState<DashboardStats['dailyMetrics'] | null>(null);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatus, setCampaignStatus] = useState<'all' | 'draft' | 'scheduled' | 'sending' | 'sent'>('all');
  const [campaignChannel, setCampaignChannel] = useState<'all' | 'email' | 'sms' | 'whatsapp' | 'gocontact'>('all');
  const [compare, setCompare] = useState<{ current: { sent: number; opened: number; clicked: number; bounced: number }; prev: { sent: number; opened: number; clicked: number; bounced: number } } | null>(null);

  const deliveryRef = useRef<HTMLDivElement | null>(null);
  const engagementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const d = Number(params.get('days') ?? '');
    if ([7, 14, 30, 90].includes(d)) setDays(d as 7 | 14 | 30 | 90);

    const q = params.get('q');
    if (q !== null) setCampaignSearch(q);

    const st = params.get('status');
    if (st && (['all', 'draft', 'scheduled', 'sending', 'sent'] as const).includes(st as any)) {
      setCampaignStatus(st as any);
    }

    const ch = params.get('channel');
    if (ch && (['all', 'email', 'sms', 'whatsapp', 'gocontact'] as const).includes(ch as any)) {
      setCampaignChannel(ch as any);
    }

    const c = params.get('c');
    if (c !== null) {
      const ids = c.split(',').map(s => s.trim()).filter(Boolean);
      const unique = Array.from(new Set(ids)).slice(0, 3);
      setSelectedCampaignIds(unique);
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (days !== 30) params.set('days', String(days));
    if (campaignSearch.trim()) params.set('q', campaignSearch.trim());
    if (campaignStatus !== 'all') params.set('status', campaignStatus);
    if (campaignChannel !== 'all') params.set('channel', campaignChannel);
    if (selectedCampaignIds.length) params.set('c', selectedCampaignIds.join(','));

    const next = params.toString() ? `?${params.toString()}` : '';
    if (next !== location.search && next !== lastWrittenSearch.current) {
      lastWrittenSearch.current = next;
      navigate({ search: next }, { replace: true });
    }
  }, [campaignChannel, campaignSearch, campaignStatus, days, location.search, navigate, selectedCampaignIds]);

  const selectedCampaign = useMemo(() => {
    if (selectedCampaignIds.length !== 1) return null;
    const id = selectedCampaignIds[0];
    const byList = campaignList.find(c => c.id === id);
    if (byList) {
      const sent = byList.sentCount || 0;
      const openRate = byList.openRate || 0;
      const clickRate = byList.clickRate || 0;
      const bounceRate = byList.bounceRate || 0;
      return {
        campaignId: byList.id,
        campaignName: byList.name,
        sent,
        opened: Math.round(sent * openRate / 100),
        clicked: Math.round(sent * clickRate / 100),
        bounced: Math.round(sent * bounceRate / 100),
        openRate,
        clickRate,
        bounceRate,
      } as any;
    }
    const top = data?.topCampaigns.find(c => c.campaignId === id) ?? null;
    return top ?? null;
  }, [campaignList, data?.topCampaigns, selectedCampaignIds]);

  const load = async (nextDays: number, campaignId?: string) => {
    try {
      setRefreshing(true);
      if (campaignId) {
        const r = await fetchAnalytics({ days: nextDays * 2, campaignId });
        const all = Array.isArray(r.data.dailyMetrics) ? r.data.dailyMetrics : [];
        const prev = all.slice(0, Math.max(0, all.length - nextDays));
        const curr = all.slice(-nextDays);
        setSeriesMetrics(curr);
        setCompare(computeCompare(curr, prev));
        return;
      }

      if (!data) setLoading(true);

      const r = await fetchAnalytics({ days: nextDays * 2 });
      const all = Array.isArray(r.data.dailyMetrics) ? r.data.dailyMetrics : [];
      const truncated = all.slice(-nextDays);
      setData({ ...r.data, dailyMetrics: truncated });
      setCompare(computeCompare(truncated, all.slice(0, Math.max(0, all.length - nextDays))));

      try {
        const cl = await fetchCampaigns({ perPage: 500, status: 'all' });
        const rows = Array.isArray((cl as any).data) ? (cl as any).data : [];
        setCampaignList(rows);
      } catch {}
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
      if (!campaignId) setSeriesMetrics(null);
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

    if (selectedCampaignIds.length > 1 && avgSeries?.length) {
      const totals = computeTotals(avgSeries);
      const sent = totals.sent;
      const openRate = sent > 0 ? (totals.opened / sent) * 100 : 0;
      const clickRate = sent > 0 ? (totals.clicked / sent) * 100 : 0;
      const bounceRate = sent > 0 ? (totals.bounced / sent) * 100 : 0;
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
  }, [avgSeries, data?.bounceRate, data?.clickRate, data?.openRate, selectedCampaign, selectedCampaignIds.length]);

  useEffect(() => {
    load(days);
  }, [days]);

  useEffect(() => {
    const run = async () => {
      if (selectedCampaignIds.length === 1) {
        await load(days, selectedCampaignIds[0]);
        setSelectedSeries({});
        setAvgSeries(null);
        return;
      }
      if (selectedCampaignIds.length > 1) {
        const ids = selectedCampaignIds.slice(0, 3);
        const results: Record<string, DashboardStats['dailyMetrics']> = {};
        await Promise.all(ids.map(async id => {
          const r = await fetchAnalytics({ days, campaignId: id });
          results[id] = Array.isArray(r.data.dailyMetrics) ? r.data.dailyMetrics : [];
        }));
        setSelectedSeries(results);
        const keys = Object.keys(results);
        if (keys.length) {
          const minLen = Math.min(...keys.map(k => results[k].length));
          const avg = Array.from({ length: minLen }, (_, i) => {
            const idx = results[keys[0]].length - minLen + i;
            const date = results[keys[0]][idx].date;
            const sum = keys.reduce((acc, k) => {
              const row = results[k][results[k].length - minLen + i];
              acc.sent += row.sent; acc.opened += row.opened; acc.clicked += row.clicked; acc.bounced += row.bounced; return acc;
            }, { sent: 0, opened: 0, clicked: 0, bounced: 0 });
            const n = keys.length;
            return { date, sent: Math.round(sum.sent / n), opened: Math.round(sum.opened / n), clicked: Math.round(sum.clicked / n), bounced: Math.round(sum.bounced / n) };
          });
          setAvgSeries(avg);
        } else {
          setAvgSeries(null);
        }
        setSeriesMetrics(null);
        return;
      }
      setSeriesMetrics(null);
      setSelectedSeries({});
      setAvgSeries(null);
    };
    run();
  }, [selectedCampaignIds, days]);

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

  const handlePrintPdf = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900');
    if (!w) {
      toast({ title: 'Pop-up bloqueado', description: 'Permita pop-ups para imprimir/exportar PDF.', variant: 'destructive' });
      return;
    }

    const today = new Date();
    const dateLabel = today.toISOString().slice(0, 10);

    const selectedNames = selectedCampaignIds
      .map(id => campaignList.find(c => c.id === id)?.name || id)
      .join(', ');

    const base = selectedCampaign
      ? { sent: selectedCampaign.sent, opened: selectedCampaign.opened, clicked: selectedCampaign.clicked, bounced: selectedCampaign.bounced }
      : (selectedCampaignIds.length > 1 && avgSeries?.length)
        ? computeTotals(avgSeries)
        : (compare?.current ?? computeTotals(data.dailyMetrics));

    const delivered = Math.max(0, (base.sent || 0) - (base.bounced || 0));
    const openRate = base.sent > 0 ? (base.opened / base.sent) * 100 : 0;
    const clickRate = base.sent > 0 ? (base.clicked / base.sent) * 100 : 0;
    const bounceRate = base.sent > 0 ? (base.bounced / base.sent) * 100 : 0;

    const deliverySvg = deliveryRef.current?.querySelector('svg')?.outerHTML ?? '';
    const engagementSvg = engagementRef.current?.querySelector('svg')?.outerHTML ?? '';

    const top = (campaignList.length ? campaignList : [])
      .slice()
      .sort((a, b) => (b.openRate - a.openRate) || (b.clickRate - a.clickRate))
      .slice(0, 12);

    const html = `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Relatório Analítica</title>
<style>
  :root { --fg:#0b1220; --muted:#5b667a; --border:#d8dee9; --bg:#ffffff; --card:#ffffff; --accent:#06b6d4; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--fg); background:var(--bg); }
  .page { padding: 28px; max-width: 1100px; margin: 0 auto; }
  .title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .subtitle { color: var(--muted); margin-top: 4px; font-size: 12px; }
  .grid { display:grid; gap:12px; }
  .grid-2 { grid-template-columns: 2fr 1fr; }
  .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .card { border: 1px solid var(--border); border-radius: 12px; padding: 14px; background: var(--card); }
  .k { font-size: 11px; color: var(--muted); }
  .v { font-size: 14px; font-weight: 700; margin-top: 2px; }
  .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); font-size: 11px; color: var(--muted); }
  .section { margin-top: 14px; }
  .section h2 { margin: 0 0 8px; font-size: 13px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid var(--border); padding: 8px 6px; font-size: 12px; text-align:left; vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  svg { max-width: 100%; height: auto; }
  @media print { .no-print { display:none !important; } body { background:#fff; } }
</style>
</head>
<body>
  <div class="page">
    <div class="title">Relatório • Analítica</div>
    <div class="subtitle">Período: últimos ${days} dias • Emitido em: ${dateLabel}</div>

    <div class="section">
      <h2>Contexto</h2>
      <div class="card">
        <div class="grid grid-3">
          <div><div class="k">Campanhas selecionadas</div><div class="v">${selectedCampaignIds.length ? selectedCampaignIds.length : 'Nenhuma'}</div><div class="subtitle">${selectedCampaignIds.length ? selectedNames : 'Base global'}</div></div>
          <div><div class="k">Filtros</div><div class="v"><span class="pill">status: ${campaignStatus}</span> <span class="pill">canal: ${campaignChannel}</span></div><div class="subtitle">${campaignSearch.trim() ? `busca: “${campaignSearch.trim()}”` : 'sem termo de busca'}</div></div>
          <div><div class="k">Resumo (período)</div><div class="v mono">sent ${base.sent.toLocaleString()} • del ${delivered.toLocaleString()}</div><div class="subtitle mono">OR ${openRate.toFixed(1)}% • CTR ${clickRate.toFixed(1)}% • bounce ${bounceRate.toFixed(1)}%</div></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Gráficos</h2>
      <div class="grid grid-2">
        <div class="card">
          <div class="k">Desempenho de Entrega</div>
          ${deliverySvg || '<div class="subtitle">Gráfico indisponível.</div>'}
        </div>
        <div class="card">
          <div class="k">Engajamento</div>
          ${engagementSvg || '<div class="subtitle">Gráfico indisponível.</div>'}
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Top Campanhas</h2>
      <div class="card">
        <table>
          <thead>
            <tr><th>Campanha</th><th class="mono">OR</th><th class="mono">CTR</th><th class="mono">Bounce</th><th class="mono">Enviado</th></tr>
          </thead>
          <tbody>
            ${top.map(c => `<tr><td>${escapeCsvValue(c.name)}</td><td class="mono">${c.openRate.toFixed(1)}%</td><td class="mono">${c.clickRate.toFixed(1)}%</td><td class="mono">${c.bounceRate.toFixed(1)}%</td><td class="mono">${(c.sentCount||0).toLocaleString()}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="subtitle">Dica: use “Imprimir” e selecione “Guardar como PDF”.</div>
    </div>

    <div class="section no-print">
      <button onclick="window.print()" style="border:1px solid var(--border); background:#fff; padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:600;">Imprimir / Guardar PDF</button>
    </div>
  </div>
</body>
</html>`;

    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
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
              {[7, 14, 30, 90].map((d) => (
                <DropdownMenuItem key={d} onClick={() => setDays(d as 7 | 14 | 30 | 90)}>
                  Últimos {d} dias
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            onClick={handlePrintPdf}
            disabled={refreshing}
          >
            <Printer className="w-4 h-4" /> Imprimir/PDF
          </Button>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div ref={deliveryRef} className="glass-card p-6 lg:col-span-2 bg-gradient-to-b from-cyan-500/5 via-background to-background border-t border-cyan-500/20">
          <h3 className="text-sm font-semibold mb-2">Desempenho de Entrega</h3>
          <div className="h-1 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4" />
          {(selectedCampaignIds.length > 1 && avgSeries?.length) ? (
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {(() => {
                const t = computeTotals(avgSeries);
                const openRate = t.sent > 0 ? (t.opened / t.sent) * 100 : 0;
                return (
                  <>
                    <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Média Enviado</div><div className="font-semibold font-mono">{t.sent.toLocaleString()}</div></div>
                    <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Média Aberto</div><div className="font-semibold font-mono">{t.opened.toLocaleString()}</div></div>
                    <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Média Clicado</div><div className="font-semibold font-mono">{t.clicked.toLocaleString()}</div></div>
                    <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Média Rejeitado</div><div className="font-semibold font-mono">{t.bounced.toLocaleString()}</div></div>
                    <div className="rounded-md border p-2 bg-card/50"><div className="text-muted-foreground">Média Abertura</div><div className="font-semibold font-mono">{openRate.toFixed(1)}%</div></div>
                  </>
                );
              })()}
            </div>
          ) : ((selectedCampaign || compare) && (
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="rounded-md border p-2 bg-card/50">
                <div className="text-muted-foreground">Enviado</div>
                <div className="font-semibold font-mono">{(selectedCampaign ? selectedCampaign.sent : compare?.current.sent || 0).toLocaleString()}</div>
                {compare && (
                  (() => { const curr=compare.current.sent, prev=compare.prev.sent, pct=prev?((curr-prev)/prev)*100:0; const pos=pct>=0; return <div className={cn('text-[10px] mt-0.5', pos?'text-emerald-600':'text-rose-600')}>{`${pos?'+':''}${pct.toFixed(1)}%`}</div>; })()
                )}
              </div>
              <div className="rounded-md border p-2 bg-card/50">
                <div className="text-muted-foreground">Aberto</div>
                <div className="font-semibold font-mono">{(selectedCampaign ? selectedCampaign.opened : compare?.current.opened || 0).toLocaleString()}</div>
                {compare && (
                  (() => { const curr=compare.current.opened, prev=compare.prev.opened, pct=prev?((curr-prev)/prev)*100:0; const pos=pct>=0; return <div className={cn('text-[10px] mt-0.5', pos?'text-emerald-600':'text-rose-600')}>{`${pos?'+':''}${pct.toFixed(1)}%`}</div>; })()
                )}
              </div>
              <div className="rounded-md border p-2 bg-card/50">
                <div className="text-muted-foreground">Clicado</div>
                <div className="font-semibold font-mono">{(selectedCampaign ? selectedCampaign.clicked : compare?.current.clicked || 0).toLocaleString()}</div>
                {compare && (
                  (() => { const curr=compare.current.clicked, prev=compare.prev.clicked, pct=prev?((curr-prev)/prev)*100:0; const pos=pct>=0; return <div className={cn('text-[10px] mt-0.5', pos?'text-emerald-600':'text-rose-600')}>{`${pos?'+':''}${pct.toFixed(1)}%`}</div>; })()
                )}
              </div>
              <div className="rounded-md border p-2 bg-card/50">
                <div className="text-muted-foreground">Rejeitado</div>
                <div className="font-semibold font-mono">{(selectedCampaign ? selectedCampaign.bounced : compare?.current.bounced || 0).toLocaleString()}</div>
                {compare && (
                  (() => { const curr=compare.current.bounced, prev=compare.prev.bounced, pct=prev?((curr-prev)/prev)*100:0; const pos=pct<=0; return <div className={cn('text-[10px] mt-0.5', pos?'text-emerald-600':'text-rose-600')}>{`${pos?'+':''}${pct.toFixed(1)}%`}</div>; })()
                )}
              </div>
              <div className="rounded-md border p-2 bg-card/50">
                <div className="text-muted-foreground">Abertura</div>
                <div className="font-semibold font-mono">
                  {(() => { const sent=(selectedCampaign?selectedCampaign.sent:(compare?.current.sent||0)); const opened=(selectedCampaign?selectedCampaign.opened:(compare?.current.opened||0)); const rate=sent>0?(opened/sent)*100:0; return `${rate.toFixed(1)}%`; })()}
                </div>
                {compare && (
                  (() => { const currRate=(compare.current.sent>0?(compare.current.opened/compare.current.sent)*100:0); const prevRate=(compare.prev.sent>0?(compare.prev.opened/compare.prev.sent)*100:0); const pct=currRate-prevRate; const pos=pct>=0; return <div className={cn('text-[10px] mt-0.5', pos?'text-emerald-600':'text-rose-600')}>{`${pos?'+':''}${pct.toFixed(1)} pp`}</div>; })()
                )}
              </div>
            </div>
          ))}
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={seriesMetrics ?? data.dailyMetrics}>
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
              {selectedCampaignIds.length > 1 ? (
                <>
                  {Object.keys(selectedSeries).map((id, i) => {
                    const camp = campaignList.find(c => c.id === id);
                    const name = camp?.name || id;
                    return (
                      <Line key={id} type="monotone" name={`${name} • Aberto`} dataKey="opened" data={selectedSeries[id]} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                    );
                  })}
                  {avgSeries && (
                    <Line type="monotone" name="Média • Aberto" dataKey="opened" data={avgSeries} stroke="hsl(220, 15%, 50%)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                  )}
                </>
              ) : (
                <>
                  <Line type="monotone" name="Enviado" dataKey="sent" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                  <Line type="monotone" name="Aberto" dataKey="opened" stroke={COLORS[1]} strokeWidth={2} dot={false} />
                  <Line type="monotone" name="Clicado" dataKey="clicked" stroke={COLORS[2]} strokeWidth={2} dot={false} />
                  <Line type="monotone" name="Rejeitado" dataKey="bounced" stroke={COLORS[4]} strokeWidth={2} dot={false} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div ref={engagementRef} className="glass-card p-6 bg-gradient-to-b from-fuchsia-500/5 via-background to-background border-t border-fuchsia-500/20">
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
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
            <input
              value={campaignSearch}
              onChange={e => setCampaignSearch(e.target.value)}
              placeholder="Pesquisar campanhas..."
              className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {(['all','draft','scheduled','sending','sent'] as const).map(s => (
              <button
                key={s}
                onClick={() => setCampaignStatus(s)}
                className={cn('px-2.5 py-1 rounded-md text-xs capitalize',
                  campaignStatus===s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {s==='all' ? 'Todas' : s}
              </button>
            ))}
            <span className="mx-2 text-xs text-muted-foreground">Canal:</span>
            {(['all','email','sms','whatsapp','gocontact'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setCampaignChannel(ch)}
                className={cn('px-2.5 py-1 rounded-md text-xs capitalize',
                  campaignChannel===ch ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto pr-1">
          <div className="divide-y divide-border rounded-md border">
            {(campaignList.length ? campaignList.map(c => ({
              id: c.id,
              name: c.name,
              sent: c.sentCount || 0,
              openRate: c.openRate || 0,
              clickedRate: c.clickRate || 0,
              bouncedRate: c.bounceRate || 0,
              rate: c.openRate || 0,
            })) : (data.topCampaigns || []).map(c => ({
              id: c.campaignId,
              name: c.campaignName,
              sent: c.sent,
              openRate: c.sent > 0 ? (c.opened / c.sent) * 100 : 0,
              clickedRate: c.sent > 0 ? (c.clicked / c.sent) * 100 : 0,
              bouncedRate: c.sent > 0 ? (c.bounced / c.sent) * 100 : 0,
              rate: c.sent > 0 ? (c.opened / c.sent) * 100 : 0,
            })) ).filter(c => c.name.toLowerCase().includes(campaignSearch.toLowerCase()))
            .filter(c => {
              if (!campaignList.length) return true;
              const full = campaignList.find(x => x.id === c.id);
              if (!full) return true;
              const okStatus = campaignStatus==='all' || full.status===campaignStatus;
              const okChannel = campaignChannel==='all' || (full.channel || 'email')===campaignChannel;
              return okStatus && okChannel;
            }).map(c => {
              const active = selectedCampaignIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (active) setSelectedCampaignIds(selectedCampaignIds.filter(id => id !== c.id));
                    else setSelectedCampaignIds(prev => prev.length >= 3 ? [...prev.slice(1), c.id] : [...prev, c.id]);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/50 transition-colors',
                    active && 'bg-primary/5 ring-1 ring-primary/30'
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Enviado {c.sent.toLocaleString()} • Abertura {(c.openRate).toFixed(1)}% • Clique {(c.clickedRate).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{c.rate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">abertura</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 bg-gradient-to-b from-primary/5 via-background to-background lg:col-span-2">
          <h3 className="text-sm font-semibold mb-2">Heatmap de Engajamento</h3>
          <div className="h-1 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4" />
          {(() => {
            const rows = Array.isArray(data.heatmapData) ? data.heatmapData : [];
            const max = Math.max(1, ...rows.map(r => Number(r.value) || 0));
            const map = new Map(rows.map(r => [`${r.day}-${r.hour}`, Number(r.value) || 0]));
            const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            return (
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <div className="grid grid-rows-7 gap-1 pt-5">
                  {dayLabels.map(d => (
                    <div key={d} className="h-3 flex items-center text-[10px] text-muted-foreground">{d}</div>
                  ))}
                </div>
                <div>
                  <div className="grid grid-cols-24 gap-1 text-[10px] text-muted-foreground mb-2">
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="h-3 flex items-center justify-center">{h % 6 === 0 ? h : ''}</div>
                    ))}
                  </div>
                  <div className="grid grid-rows-7 gap-1">
                    {Array.from({ length: 7 }, (_, day) => (
                      <div key={day} className="grid grid-cols-24 gap-1">
                        {Array.from({ length: 24 }, (_, hour) => {
                          const v = map.get(`${day}-${hour}`) ?? 0;
                          const a = Math.min(1, 0.08 + (v / max) * 0.92);
                          return (
                            <div
                              key={hour}
                              className="h-3 rounded-[3px] bg-primary"
                              style={{ opacity: a }}
                              title={`${dayLabels[day]} ${hour}h: ${v}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="glass-card p-6 bg-gradient-to-b from-primary/5 via-background to-background">
          <h3 className="text-sm font-semibold mb-2">Ranking de Assuntos</h3>
          <div className="h-1 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4" />
          {(() => {
            const rows = (campaignList.length ? campaignList : []).filter(c => (c.subject || '').trim());
            const ranked = rows
              .slice()
              .sort((a, b) => (b.openRate - a.openRate) || (b.clickRate - a.clickRate))
              .slice(0, 8);
            if (!ranked.length) {
              return <div className="text-sm text-muted-foreground">Sem dados de assunto disponíveis.</div>;
            }
            return (
              <div className="space-y-2">
                {ranked.map((c) => (
                  <div key={c.id} className="rounded-md border p-3 bg-card/50">
                    <div className="text-sm font-medium truncate">{c.subject}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between gap-3">
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono">OR {c.openRate.toFixed(1)}% • CTR {c.clickRate.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="glass-card p-6 bg-gradient-to-b from-primary/5 via-background to-background">
          <h3 className="text-sm font-semibold mb-2">Funil</h3>
          <div className="h-1 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4" />
          {(() => {
            const base = selectedCampaign
              ? { sent: selectedCampaign.sent, opened: selectedCampaign.opened, clicked: selectedCampaign.clicked, bounced: selectedCampaign.bounced }
              : (selectedCampaignIds.length > 1 && avgSeries?.length)
                ? computeTotals(avgSeries)
                : (compare?.current ?? null);

            if (!base) {
              return <div className="text-sm text-muted-foreground">Sem dados suficientes para montar o funil.</div>;
            }

            const sent = base.sent || 0;
            const delivered = Math.max(0, sent - (base.bounced || 0));
            const opened = Math.min(delivered, base.opened || 0);
            const clicked = Math.min(opened, base.clicked || 0);

            const steps = [
              { label: 'Enviado', value: sent, pct: 100 },
              { label: 'Entregue', value: delivered, pct: sent > 0 ? (delivered / sent) * 100 : 0 },
              { label: 'Aberto', value: opened, pct: sent > 0 ? (opened / sent) * 100 : 0 },
              { label: 'Clicado', value: clicked, pct: sent > 0 ? (clicked / sent) * 100 : 0 },
            ];

            return (
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-mono">{s.value.toLocaleString()} • {s.pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: `${Math.max(2, Math.min(100, s.pct))}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
                <div className="text-[11px] text-muted-foreground">
                  {selectedCampaign ? 'Base: campanha selecionada' : (selectedCampaignIds.length > 1 ? 'Base: média das campanhas selecionadas' : 'Base: período atual (global)')}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

