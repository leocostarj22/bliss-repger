import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { Changelog, ChangelogEntry } from '@/types'

// ── helpers ──────────────────────────────────────────────────────────────────

const apiFetch = (url: string, init: RequestInit = {}) =>
  fetch(url, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json', ...((init.headers as object) ?? {}) },
  })

const getCsrfToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

// ── types ─────────────────────────────────────────────────────────────────────

type EntryDraft = {
  _key: string
  type: ChangelogEntry['type']
  description: string
  module: string
  related_blog_post_id: string
}

type BlogOption = { id: string; title: string; slug: string }

// ── constants ─────────────────────────────────────────────────────────────────

const ENTRY_TYPES: { value: ChangelogEntry['type']; label: string; color: string }[] = [
  { value: 'new',         label: 'Novo',      color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { value: 'improvement', label: 'Melhoria',  color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { value: 'fix',         label: 'Correção',  color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { value: 'security',    label: 'Segurança', color: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  { value: 'breaking',    label: 'Breaking',  color: 'bg-red-500/15 text-red-300 border-red-500/30' },
]

const typeColor = (t: string) => ENTRY_TYPES.find(e => e.value === t)?.color ?? ''
const typeLabel = (t: string) => ENTRY_TYPES.find(e => e.value === t)?.label ?? t

const newEntryDraft = (): EntryDraft => ({
  _key: crypto.randomUUID(),
  type: 'new',
  description: '',
  module: '',
  related_blog_post_id: '',
})

// ── entry row ─────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  blogOptions,
  onChange,
  onRemove,
}: {
  entry: EntryDraft
  blogOptions: BlogOption[]
  onChange: (updated: EntryDraft) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  const set = (patch: Partial<EntryDraft>) => onChange({ ...entry, ...patch })

  return (
    <div className="rounded-xl border border-border bg-card/50">
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground cursor-grab" />
        <Badge variant="outline" className={`${typeColor(entry.type)} text-[10px] flex-shrink-0`}>
          {typeLabel(entry.type)}
        </Badge>
        <p className="flex-1 truncate text-sm text-foreground/90 min-w-0">
          {entry.description || <span className="text-muted-foreground italic">Sem descrição</span>}
        </p>
        <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground/90 transition-colors">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded fields */}
      {expanded && (
        <div className="grid gap-3 border-t border-border px-4 pb-4 pt-3 sm:grid-cols-2">
          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <select
              value={entry.type}
              onChange={e => set({ type: e.target.value as ChangelogEntry['type'] })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {ENTRY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Module */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Módulo <span className="text-muted-foreground">(opcional)</span></label>
            <Input
              value={entry.module}
              onChange={e => set({ module: e.target.value })}
              placeholder="Ex: CRM, RH, Finance"
              className="bg-background border-border text-sm"
            />
          </div>

          {/* Description — full width */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Descrição *</label>
            <Input
              value={entry.description}
              onChange={e => set({ description: e.target.value })}
              placeholder="Ex: Novo módulo de CRM com gestão de leads"
              className="bg-background border-border text-sm"
            />
          </div>

          {/* Related blog post */}
          {blogOptions.length > 0 && (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Artigo relacionado <span className="text-muted-foreground">(opcional — mostra "Ver artigo →" na timeline)</span>
              </label>
              <select
                value={entry.related_blog_post_id}
                onChange={e => set({ related_blog_post_id: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="">— Nenhum —</option>
                {blogOptions.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── main form ─────────────────────────────────────────────────────────────────

export default function AdminChangelogForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  // header fields
  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [isMajor, setIsMajor] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

  // entries
  const [entries, setEntries] = useState<EntryDraft[]>([newEntryDraft()])

  // blog options for the dropdown
  const [blogOptions, setBlogOptions] = useState<BlogOption[]>([])

  // load blog posts for linking
  useEffect(() => {
    apiFetch('/api/v1/blog/admin').then(r => r.json()).then(json => {
      setBlogOptions((json.data ?? []).map((p: { id: string; title: string; slug: string }) => ({ id: p.id, title: p.title, slug: p.slug })))
    }).catch(() => {})
  }, [])

  // load changelog for edit
  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      const res = await apiFetch(`/api/v1/changelog/admin/${id}`)
      if (res.ok) {
        const json = await res.json()
        const log: Changelog = json.data
        setVersion(log.version)
        setTitle(log.title)
        setSummary(log.summary ?? '')
        setReleaseDate(log.release_date.slice(0, 10))
        setIsMajor(log.is_major)
        setIsPublished(log.is_published)
        setEntries(
          log.entries.length > 0
            ? log.entries.map(e => ({
                _key: e.id,
                type: e.type as ChangelogEntry['type'],
                description: e.description,
                module: e.module ?? '',
                related_blog_post_id: e.related_blog_post?.id ?? '',
              }))
            : [newEntryDraft()]
        )
      }
      setLoading(false)
    })()
  }, [id, isEdit])

  const addEntry = () => setEntries(prev => [...prev, newEntryDraft()])

  const updateEntry = (key: string, updated: EntryDraft) =>
    setEntries(prev => prev.map(e => e._key === key ? updated : e))

  const removeEntry = (key: string) =>
    setEntries(prev => prev.filter(e => e._key !== key))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!version.trim()) { toast({ title: 'A versão é obrigatória', variant: 'destructive' }); return }
    if (!title.trim()) { toast({ title: 'O título é obrigatório', variant: 'destructive' }); return }
    if (!releaseDate) { toast({ title: 'A data de lançamento é obrigatória', variant: 'destructive' }); return }

    const invalidEntry = entries.find(e => !e.description.trim())
    if (invalidEntry) { toast({ title: 'Todas as entradas precisam de descrição', variant: 'destructive' }); return }

    setSaving(true)
    try {
      const payload = {
        version: version.trim(),
        title: title.trim(),
        summary: summary.trim() || null,
        release_date: releaseDate,
        is_major: isMajor,
        is_published: isPublished,
        entries: entries.map((e, i) => ({
          type: e.type,
          description: e.description.trim(),
          module: e.module.trim() || null,
          related_blog_post_id: e.related_blog_post_id || null,
          sort_order: i,
        })),
      }

      let res: Response
      if (isEdit) {
        // update header
        res = await apiFetch(`/api/v1/changelog/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            version: payload.version,
            title: payload.title,
            summary: payload.summary,
            release_date: payload.release_date,
            is_major: payload.is_major,
            is_published: payload.is_published,
          }),
          headers: { 'X-XSRF-TOKEN': getCsrfToken() },
        })
        if (!res.ok) throw new Error()

        // replace all entries: delete existing then recreate
        const existingRes = await apiFetch(`/api/v1/changelog/admin/${id}`)
        if (existingRes.ok) {
          const existingJson = await existingRes.json()
          const existingEntries: ChangelogEntry[] = existingJson.data?.entries ?? []
          await Promise.all(
            existingEntries.map(e =>
              apiFetch(`/api/v1/changelog/${id}/entries/${e.id}`, { method: 'DELETE', headers: { 'X-XSRF-TOKEN': getCsrfToken() } })
            )
          )
        }
        await Promise.all(
          payload.entries.map(e =>
            apiFetch(`/api/v1/changelog/${id}/entries`, {
              method: 'POST',
              body: JSON.stringify(e),
              headers: { 'X-XSRF-TOKEN': getCsrfToken() },
            })
          )
        )
      } else {
        res = await apiFetch('/api/v1/changelog', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'X-XSRF-TOKEN': getCsrfToken() },
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json?.message ?? 'Erro ao criar versão')
        }
      }

      toast({ title: isEdit ? 'Versão atualizada' : 'Versão criada' })
      navigate('/admin/changelog')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocorreu um erro'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/changelog')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="page-title">{isEdit ? `Editar ${version || 'versão'}` : 'Nova Versão'}</h1>
          <p className="page-subtitle">Changelog · GMCentral</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main — entries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Entradas <span className="ml-1 text-xs font-normal text-muted-foreground">({entries.length})</span>
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addEntry} className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />Adicionar entrada
            </Button>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma entrada ainda.</p>
              <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                <Plus className="mr-2 h-3.5 w-3.5" />Adicionar primeira entrada
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <EntryRow
                  key={entry._key}
                  entry={entry}
                  blogOptions={blogOptions}
                  onChange={updated => updateEntry(entry._key, updated)}
                  onRemove={() => removeEntry(entry._key)}
                />
              ))}
            </div>
          )}

          {entries.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={addEntry} className="w-full border border-dashed border-border text-muted-foreground hover:text-foreground/90 hover:border-border">
              <Plus className="mr-2 h-3.5 w-3.5" />Adicionar entrada
            </Button>
          )}
        </div>

        {/* Side — version info */}
        <div className="space-y-5">
          {/* Publish */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Estado</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublished(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${!isPublished ? 'border-slate-500 bg-secondary text-foreground' : 'border-border text-muted-foreground hover:border-border'}`}
              >
                Rascunho
              </button>
              <button
                type="button"
                onClick={() => setIsPublished(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${isPublished ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-border text-muted-foreground hover:border-border'}`}
              >
                Publicar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsMajor(v => !v)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${isMajor ? 'border-violet-500/50 bg-violet-500/15 text-violet-300' : 'border-border text-muted-foreground hover:border-border'}`}
            >
              <span className={`h-2 w-2 rounded-full ${isMajor ? 'bg-violet-400' : 'bg-slate-600'}`} />
              {isMajor ? 'Versão Major (destaque)' : 'Marcar como Major'}
            </button>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/admin/changelog')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Guardar' : 'Criar'}
              </Button>
            </div>
          </div>

          {/* Version + date */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Identificação</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Versão *</label>
              <Input
                value={version}
                onChange={e => setVersion(e.target.value)}
                placeholder="Ex: v2.5.0"
                className="bg-background border-border font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Release de Abril 2026"
                className="bg-background border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data de lançamento *</label>
              <Input
                type="date"
                value={releaseDate}
                onChange={e => setReleaseDate(e.target.value)}
                className="bg-background border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Resumo <span className="text-muted-foreground">(opcional)</span></label>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Breve descrição do que mudou nesta versão..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
              />
            </div>
          </div>

          {/* Entry type legend */}
          <div className="glass-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Legenda de tipos</h3>
            <div className="space-y-1.5">
              {ENTRY_TYPES.map(t => (
                <div key={t.value} className="flex items-center gap-2">
                  <Badge variant="outline" className={`${t.color} text-[10px] w-20 justify-center`}>{t.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {t.value === 'new' && 'Funcionalidade nova'}
                    {t.value === 'improvement' && 'Melhoria numa existente'}
                    {t.value === 'fix' && 'Correção de bug'}
                    {t.value === 'security' && 'Correção de segurança'}
                    {t.value === 'breaking' && 'Mudança que quebra algo'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
