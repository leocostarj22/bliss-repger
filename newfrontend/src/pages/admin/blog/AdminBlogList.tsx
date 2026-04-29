import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, Loader2, Newspaper, ArrowLeft, Globe, FileText, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { BlogPost } from '@/types'

const apiFetch = (url: string, init: RequestInit = {}) =>
  fetch(url, { ...init, credentials: 'include', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json', ...((init.headers as object) ?? {}) } })

const getCsrfToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const CATEGORY_LABELS: Record<string, string> = {
  feature: 'Funcionalidade', improvement: 'Melhoria', tutorial: 'Tutorial', announcement: 'Anúncio',
}
const CATEGORY_COLORS: Record<string, string> = {
  feature:      'bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300',
  improvement:  'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300',
  tutorial:     'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  announcement: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
}

export default function AdminBlogList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [allPosts, setAllPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/v1/blog/admin')
      if (res.ok) { const json = await res.json(); setAllPosts(json.data ?? []) }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (statusFilter === 'all') setPosts(allPosts)
    else setPosts(allPosts.filter(p => p.status === statusFilter))
  }, [allPosts, statusFilter])

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Eliminar "${post.title}"? Esta ação não pode ser revertida.`)) return
    setDeleting(post.id)
    try {
      const res = await apiFetch(`/api/v1/blog/${post.id}`, { method: 'DELETE', headers: { 'X-XSRF-TOKEN': getCsrfToken() } as HeadersInit })
      if (res.ok) { setAllPosts(prev => prev.filter(p => p.id !== post.id)); toast({ title: 'Publicação eliminada' }) }
      else toast({ title: 'Erro ao eliminar', variant: 'destructive' })
    } finally { setDeleting(null) }
  }

  const tabCls = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-all ${active
      ? 'bg-violet-500/15 text-violet-700 border border-violet-500/30 dark:text-violet-300'
      : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/blog')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title">Gerir Publicações</h1>
            <p className="page-subtitle">Crie e edite os artigos de Últimas Atualizações</p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/blog/new')} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4" />Nova Publicação
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'published', 'scheduled', 'draft'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={tabCls(statusFilter === s)}>
            {s === 'all' ? 'Todos' : s === 'published' ? 'Publicados' : s === 'scheduled' ? 'Agendados' : 'Rascunhos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">A carregar...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="mb-4 text-sm text-muted-foreground">Nenhuma publicação encontrada.</p>
          <Button variant="outline" onClick={() => navigate('/admin/blog/new')}>
            <Plus className="mr-2 h-4 w-4" />Criar a primeira publicação
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Categoria</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Estado</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Data</th>
                <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground sm:table-cell">Views</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {posts.map(post => (
                <tr key={post.id} className="bg-card transition-colors hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {post.cover_image_url ? (
                        <img src={post.cover_image_url} alt="" className="h-10 w-14 flex-shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                          <Newspaper className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">{post.title}</p>
                        {post.is_featured && <span className="text-[10px] text-violet-600 dark:text-violet-400">★ Destaque</span>}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Badge variant="outline" className={`${CATEGORY_COLORS[post.category] ?? ''} text-[10px]`}>
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Badge variant="outline" className={
                      post.status === 'published'
                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 text-[10px]'
                        : post.status === 'scheduled'
                          ? 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300 text-[10px]'
                          : 'bg-muted text-muted-foreground border-border text-[10px]'
                    }>
                      {post.status === 'published'
                        ? <><Globe className="mr-1 h-2.5 w-2.5" />Publicado</>
                        : post.status === 'scheduled'
                          ? <><Clock className="mr-1 h-2.5 w-2.5" />Agendado</>
                          : <><FileText className="mr-1 h-2.5 w-2.5" />Rascunho</>}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{fmtDate(post.published_at)}</td>
                  <td className="hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">
                    <span className="flex items-center justify-end gap-1"><Eye className="h-3 w-3" />{post.views_count}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === 'published' && (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/blog/${post.slug}`)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/blog/${post.id}/edit`)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(post)} disabled={deleting === post.id} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                        {deleting === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
