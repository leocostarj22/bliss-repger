import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, GitBranch, Sparkles, Wrench, Bug, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Loader2, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchMyAccess } from '@/services/api';
import type { Changelog as ChangelogType, ChangelogEntry } from '@/types';

type EntryType = ChangelogEntry['type'];

const entryConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new:         { label: 'Novo',      color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 dark:border-emerald-400/30', icon: Sparkles },
  improvement: { label: 'Melhoria',  color: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300 dark:border-sky-400/30',                    icon: Wrench },
  fix:         { label: 'Correção',  color: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300 dark:border-amber-400/30',           icon: Bug },
  breaking:    { label: 'Breaking',  color: 'bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300 dark:border-red-400/30',                     icon: AlertTriangle },
  security:    { label: 'Segurança', color: 'bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300 dark:border-violet-400/30',      icon: ShieldCheck },
};

const TYPE_ORDER: EntryType[] = ['new', 'improvement', 'fix', 'security', 'breaking'];

function groupEntries(entries: ChangelogEntry[]): Partial<Record<EntryType, ChangelogEntry[]>> {
  return entries.reduce((acc, entry) => {
    const t = entry.type as EntryType;
    if (!acc[t]) acc[t] = [];
    acc[t]!.push(entry);
    return acc;
  }, {} as Partial<Record<EntryType, ChangelogEntry[]>>);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function VersionBlock({ log }: { log: ChangelogType }) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const grouped = groupEntries(log.entries);

  return (
    <div className="relative flex gap-6">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div className={`mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 ${log.is_major ? 'border-violet-500 bg-violet-500' : 'border-border bg-muted'}`} />
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>

      {/* Card */}
      <div className="mb-10 flex-1 pb-2">
        <button onClick={() => setExpanded(v => !v)} className="flex w-full items-start justify-between gap-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-lg font-bold ${log.is_major ? 'text-violet-600 dark:text-violet-400' : 'text-foreground'}`}>
              {log.version}
            </span>
            {log.is_major && (
              <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400 text-[10px] uppercase tracking-wider">
                Major
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">{log.title}</span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3 pt-0.5">
            <span className="text-xs text-muted-foreground">{formatDate(log.release_date)}</span>
            {expanded
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {log.summary && <p className="mt-1.5 text-sm text-muted-foreground">{log.summary}</p>}

        {expanded && (
          <div className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4">
            {TYPE_ORDER.filter(t => grouped[t]?.length).map(type => {
              const cfg = entryConfig[type] ?? entryConfig.new;
              const Icon = cfg.icon;
              return (
                <div key={type}>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{cfg.label}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {grouped[type]!.map(entry => (
                      <li key={entry.id} className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/60">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
                          <div className="min-w-0">
                            <p className="text-sm leading-snug text-foreground">{entry.description}</p>
                            {entry.module && (
                              <Badge variant="outline" className="mt-1 text-[10px] text-muted-foreground">
                                {entry.module}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {entry.related_blog_post && (
                          <button
                            onClick={() => navigate(`/blog/${entry.related_blog_post!.slug}`)}
                            className="flex flex-shrink-0 items-center gap-1 text-xs text-violet-600 transition-colors hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
                          >
                            Ver artigo
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {log.entries.length === 0 && (
              <p className="py-2 text-center text-sm text-muted-foreground">Sem entradas registadas.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Changelog() {
  const navigate = useNavigate();
  const [changelogs, setChangelogs] = useState<ChangelogType[]>([]);
  const [filtered, setFiltered] = useState<ChangelogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [logRes, access] = await Promise.all([
          fetch('/api/v1/changelog', { credentials: 'include', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }),
          fetchMyAccess(),
        ]);
        if (logRes.ok) { const json = await logRes.json(); setChangelogs(json.data ?? []); }
        setIsAdmin(access.data.isAdmin);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allModules = Array.from(
    new Set(changelogs.flatMap(l => l.entries.map(e => e.module).filter(Boolean)))
  ) as string[];

  useEffect(() => {
    if (filterType === 'all' && filterModule === 'all') { setFiltered(changelogs); return; }
    const result = changelogs
      .map(log => ({ ...log, entries: log.entries.filter(e => (filterType === 'all' || e.type === filterType) && (filterModule === 'all' || e.module === filterModule)) }))
      .filter(log => log.entries.length > 0);
    setFiltered(result);
  }, [changelogs, filterType, filterModule]);

  const activeFilters = filterType !== 'all' || filterModule !== 'all';
  const selectCls = 'rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
            <GitBranch className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="page-title">Changelog</h1>
            <p className="page-subtitle">Histórico de versões e melhorias do GMCentral</p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/changelog')} className="flex flex-shrink-0 items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Gerir Changelog
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-3">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectCls}>
          <option value="all">Todos os tipos</option>
          {Object.entries(entryConfig).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
        </select>
        {allModules.length > 0 && (
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className={selectCls}>
            <option value="all">Todos os módulos</option>
            {allModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        {activeFilters && (
          <button onClick={() => { setFilterType('all'); setFilterModule('all'); }} className={`${selectCls} text-muted-foreground hover:text-foreground transition-colors`}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A carregar...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <GitBranch className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {activeFilters ? 'Nenhuma versão encontrada para os filtros selecionados.' : 'Ainda não há versões publicadas.'}
          </p>
        </div>
      ) : (
        <div>{filtered.map(log => <VersionBlock key={log.id} log={log} />)}</div>
      )}
    </div>
  );
}
