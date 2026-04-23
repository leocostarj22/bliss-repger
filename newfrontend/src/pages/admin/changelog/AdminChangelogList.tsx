import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Loader2, GitBranch, ArrowLeft, Globe, FileText, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { Changelog } from '@/types'

const apiFetch = (url: string, init: RequestInit = {}) =>
  fetch(url, { ...init, credentials: 'include', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json', ...((init.headers as object) ?? {}) } })

const getCsrfToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })

const ENTRY_TYPE_LABELS: Record<string, string> = {
  new: 'Novo', improvement: 'Melhoria', fix: 'Correção', breaking: 'Breaking', security: 'Segurança',
}

export default function AdminChangelogList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [changelogs, setChangelogs] = useState<Changelog[]>([])
  const [allChangelogs, setAllChangelogs] = useState<Changelog[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/v1/changelog/admin')
      if (res.ok) { const json = await res.json(); setAllChangelogs(json.data ?? []) }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (statusFilter === 'all') setChangelogs(allChangelogs)
    else setChangelogs(allChangelogs.filter(c => (statusFilter === 'published') === c.is_published))
  }, [allChangelogs, statusFilter])

  const handleDelete = async (log: Changelog) => {
    if (!confirm(`Eliminar a versão "${log.version}"? Todas as entradas serão removidas.`)) return
    setDeleting(log.id)
    try {
      const res = await apiFetch(`/api/v1/changelog/${log.id}`, { method: 'DELETE', headers: { 'X-XSRF-TOKEN': getCsrfToken() } as HeadersInit })
      if (res.ok) { setAllChangelogs(prev => prev.filter(c => c.id !== log.id)); toast({ title: `Versão ${log.version} eliminada` }) }
      else toast({ title: 'Erro ao eliminar', variant: 'destructive' })
    } finally { setDeleting(null) }
  }

  const togglePublish = async (log: Changelog) => {
    const res = await apiFetch(`/api/v1/changelog/${log.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_published: !log.is_published }),
      headers: { 'X-XSRF-TOKEN': getCsrfToken() } as HeadersInit,
    })
    if (res.ok) {
      setAllChangelogs(prev => prev.map(c => c.id === log.id ? { ...c, is_published: !c.is_published } : c))
      toast({ title: !log.is_published ? `${log.version} publicada` : `${log.version} revertida para rascunho` })
    }
  }

  const tabCls = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-all ${active
      ? 'bg-violet-500/15 text-violet-700 border border-violet-500/30 dark:text-violet-300'
      : 'text-muted-foreground hover:text-foreground'
    }`

  const entryCounts = (log: Changelog) => {
    const counts: Record<string, number> = {}
    log.entries.forEach(e => { counts[e.type] = (counts[e.type] ?? 0) + 1 })
    return counts
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/reports/changelog')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title">Gerir Changelog</h1>
            <p className="page-subtitle">Versões e histórico de melhorias do GMCentral</p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/changelog/new')} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4" />Nova Versão
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'published', 'draft'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={tabCls(statusFilter === s)}>
            {s === 'all' ? 'Todas' : s === 'published' ? 'Publicadas' : 'Rascunhos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">A carregar...</span>
        </div>
      ) : changelogs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <GitBranch className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="mb-4 text-sm text-muted-foreground">Nenhuma versão encontrada.</p>
          <Button variant="outline" onClick={() => navigate('/admin/changelog/new')}>
            <Plus className="mr-2 h-4 w-4" />Criar primeira versão
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {changelogs.map(log => {
            const counts = entryCounts(log)
            return (
              <div key={log.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/40">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`font-mono text-base font-bold ${log.is_major ? 'text-violet-600 dark:text-violet-400' : 'text-foreground'}`}>
                      {log.version}
                    </span>
                    {log.is_major && (
                      <Badge className="border-violet-500/30 bg-violet-500/15 text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        <Star className="mr-1 h-2.5 w-2.5" />Major
                      </Badge>
                    )}
                    <Badge variant="outline" className={log.is_published
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 text-[10px]'
                      : 'bg-muted text-muted-foreground border-border text-[10px]'
                    }>
                      {log.is_published
                        ? <><Globe className="mr-1 h-2.5 w-2.5" />Publicada</>
                        : <><FileText className="mr-1 h-2.5 w-2.5" />Rascunho</>}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-foreground">{log.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{fmtDate(log.release_date)}</span>
                    <span>{log.entries.length} {log.entries.length === 1 ? 'entrada' : 'entradas'}</span>
                    {Object.entries(counts).map(([type, n]) => (
                      <span key={type}>{n} {ENTRY_TYPE_LABELS[type] ?? type}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => togglePublish(log)}
                    className={`h-8 px-3 text-xs ${log.is_published ? 'text-muted-foreground hover:text-amber-600' : 'text-muted-foreground hover:text-emerald-600'}`}>
                    {log.is_published ? 'Despublicar' : 'Publicar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/changelog/${log.id}/edit`)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(log)} disabled={deleting === log.id} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                    {deleting === log.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
