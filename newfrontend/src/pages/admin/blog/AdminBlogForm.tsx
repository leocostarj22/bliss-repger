import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, X, Star, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { useToast } from '@/components/ui/use-toast'
import type { BlogPost } from '@/types'

// ── helpers ──────────────────────────────────────────────────────────────────

const apiFetch = (url: string, init: RequestInit = {}) =>
  fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      ...((init.headers as object) ?? {}),
    },
  })

const getCsrfToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const CATEGORIES = [
  { value: 'feature',      label: 'Nova Funcionalidade' },
  { value: 'improvement',  label: 'Melhoria' },
  { value: 'tutorial',     label: 'Tutorial' },
  { value: 'announcement', label: 'Anúncio' },
]

// ── component ────────────────────────────────────────────────────────────────

export default function AdminBlogForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  // form fields
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<string>('feature')
  const [status, setStatus] = useState<'draft' | 'scheduled' | 'published'>('draft')
  const [scheduledAt, setScheduledAt] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [coverUrl, setCoverUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // image upload
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCover, setUploadingCover] = useState(false)

  // load post for edit
  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      // fetch from admin endpoint which returns drafts too
      const res = await apiFetch(`/api/v1/blog/admin/${id}`)
      if (res.ok) {
        const json = await res.json()
        const p: BlogPost = json.data
        setTitle(p.title)
        setSummary(p.summary ?? '')
        setContent(p.content)
        setCategory(p.category)
        setStatus(p.status as 'draft' | 'scheduled' | 'published')
        if (p.published_at) {
          const d = new Date(p.published_at)
          setScheduledAt(d.toISOString().slice(0, 16))
        }
        setIsFeatured(p.is_featured)
        setCoverUrl(p.cover_image_url ?? '')
        setYoutubeUrl(p.youtube_video_url ?? '')
        setTags(p.tags ?? [])
      }
      setLoading(false)
    })()
  }, [id, isEdit])

  // tag input handlers
  const addTag = () => {
    const t = tagsInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagsInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  // cover image upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/v1/communication/posts/images/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': getCsrfToken() },
        body: form,
      })
      if (res.ok) {
        const json = await res.json()
        setCoverUrl(json.url ?? json.path ?? '')
        toast({ title: 'Imagem carregada' })
      } else {
        toast({ title: 'Erro ao carregar imagem', variant: 'destructive' })
      }
    } finally {
      setUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast({ title: 'O título é obrigatório', variant: 'destructive' }); return }
    if (!content.trim()) { toast({ title: 'O conteúdo é obrigatório', variant: 'destructive' }); return }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim() || null,
        content,
        category,
        status,
        published_at: status === 'scheduled' && scheduledAt ? scheduledAt : null,
        is_featured: isFeatured,
        cover_image_url: coverUrl || null,
        youtube_video_url: youtubeUrl || null,
        tags: tags.length ? tags : null,
      }

      const res = isEdit
        ? await apiFetch(`/api/v1/blog/${id}`, { method: 'PUT', body: JSON.stringify(payload), headers: { 'X-XSRF-TOKEN': getCsrfToken() } })
        : await apiFetch('/api/v1/blog', { method: 'POST', body: JSON.stringify(payload), headers: { 'X-XSRF-TOKEN': getCsrfToken() } })

      if (res.ok) {
        toast({ title: isEdit ? 'Publicação atualizada' : 'Publicação criada' })
        navigate('/admin/blog')
      } else {
        const json = await res.json().catch(() => ({}))
        const msg = json?.message ?? (isEdit ? 'Erro ao atualizar' : 'Erro ao criar')
        toast({ title: msg, variant: 'destructive' })
      }
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
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/blog')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="page-title">{isEdit ? 'Editar Publicação' : 'Nova Publicação'}</h1>
          <p className="page-subtitle">Últimas Atualizações · GMCentral</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/90">Título *</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Novo módulo de CRM"
              className="bg-background border-border"
            />
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/90">Resumo <span className="text-muted-foreground">(aparece nos cards)</span></label>
            <Input
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Breve descrição do que foi adicionado..."
              maxLength={500}
              className="bg-background border-border"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/90">Conteúdo *</label>
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Escreva o artigo aqui..."
              />
            </div>
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          {/* Publish actions */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Publicação</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('draft')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${status === 'draft' ? 'border-slate-500 bg-secondary text-foreground' : 'border-border text-muted-foreground hover:border-border'}`}
              >
                Rascunho
              </button>
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${status === 'published' ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-border text-muted-foreground hover:border-border'}`}
              >
                Publicar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStatus('scheduled')}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${status === 'scheduled' ? 'border-amber-500/50 bg-amber-500/15 text-amber-300' : 'border-border text-muted-foreground hover:border-border'}`}
            >
              <Clock className={`h-4 w-4 ${status === 'scheduled' ? 'text-amber-400' : ''}`} />
              Agendar publicação
            </button>
            {status === 'scheduled' && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Data e hora de publicação</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  required
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsFeatured(v => !v)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${isFeatured ? 'border-violet-500/50 bg-violet-500/15 text-violet-300' : 'border-border text-muted-foreground hover:border-border'}`}
            >
              <Star className={`h-4 w-4 ${isFeatured ? 'fill-violet-400 text-violet-400' : ''}`} />
              {isFeatured ? 'Destacado no topo' : 'Marcar como destaque'}
            </button>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/admin/blog')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEdit ? 'Guardar' : 'Criar'}
              </Button>
            </div>
          </div>

          {/* Category */}
          <div className="glass-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Categoria</h3>
            <div className="space-y-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all text-left ${category === c.value ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30' : 'text-muted-foreground hover:bg-secondary/60'}`}
                >
                  <span className={`h-2 w-2 rounded-full ${category === c.value ? 'bg-violet-400' : 'bg-slate-600'}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cover image */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Imagem de Capa</h3>
            {coverUrl && (
              <div className="relative overflow-hidden rounded-lg">
                <img src={coverUrl} alt="Capa" className="w-full h-32 object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground/90 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="space-y-2">
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
                {uploadingCover ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                {uploadingCover ? 'A carregar...' : 'Carregar imagem'}
              </Button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              <p className="text-xs text-muted-foreground text-center">ou cole um URL abaixo</p>
              <Input
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                placeholder="https://..."
                className="bg-background border-border text-xs"
              />
            </div>
          </div>

          {/* YouTube */}
          <div className="glass-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Vídeo YouTube</h3>
            <Input
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="bg-background border-border text-sm"
            />
          </div>

          {/* Tags */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Tags</h3>
            <div className="flex gap-2">
              <Input
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Ex: CRM"
                className="bg-background border-border text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] text-foreground/90 border-border gap-1 cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag}
                    <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
