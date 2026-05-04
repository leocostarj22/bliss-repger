import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Eye, Calendar, User, Loader2, Tag, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchMyAccess } from '@/services/api'
import type { BlogPost } from '@/types'

const apiFetch = (url: string) =>
  fetch(url, { credentials: 'include', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })

const fmtDate = (iso: string | null) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

const CATEGORY_COLORS: Record<string, string> = {
  feature:      'bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300 dark:border-violet-400/30',
  improvement:  'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300 dark:border-sky-400/30',
  tutorial:     'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 dark:border-emerald-400/30',
  announcement: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300 dark:border-amber-400/30',
}

const CATEGORY_LABELS: Record<string, string> = {
  feature: 'Nova Funcionalidade', improvement: 'Melhoria', tutorial: 'Tutorial', announcement: 'Anúncio',
}

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!slug) return
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const [postRes, access] = await Promise.all([
          apiFetch(`/api/v1/blog/${encodeURIComponent(slug)}`),
          fetchMyAccess(),
        ])
        if (postRes.status === 404) { setNotFound(true); return }
        if (postRes.ok) { const json = await postRes.json(); setPost(json.data) }
        setIsAdmin(access.data.isAdmin)
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Publicação não encontrada.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/blog')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Voltar ao feed
        </Button>
      </div>
    )
  }

  const categoryColor = CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.feature
  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category

  return (
    <div className="animate-slide-up">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/blog')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Últimas Atualizações
        </Button>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/blog/${post.id}/edit`)} className="flex items-center gap-2">
            <Pencil className="h-3.5 w-3.5" />Editar
          </Button>
        )}
      </div>

      <article className="mx-auto max-w-3xl">
        {post.cover_image_url && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-border">
            <img src={post.cover_image_url} alt={post.title} className="h-64 w-full object-cover sm:h-80" />
          </div>
        )}

        {/* Meta */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={categoryColor}>{categoryLabel}</Badge>
          {post.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Tag className="h-2.5 w-2.5" />{tag}
            </Badge>
          ))}
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">{post.title}</h1>

        {/* Author + stats */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border pb-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{post.author.name}</span>
          {post.published_at && (
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{fmtDate(post.published_at)}</span>
          )}
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{post.reading_time_minutes} min de leitura</span>
          <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" />{post.views_count} visualizações</span>
        </div>

        {post.summary && (
          <p className="mt-6 text-base font-medium leading-relaxed text-foreground/80">{post.summary}</p>
        )}

        {post.youtube_embed_url && (
          <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-border">
            <iframe
              src={post.youtube_embed_url}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={post.title}
            />
          </div>
        )}

        {/* Rich text content */}
        <style>{`
          .blog-content p { margin-bottom: 1rem !important; }
          .blog-content p:last-child { margin-bottom: 0 !important; }
          .blog-content h1, .blog-content h2, .blog-content h3 { margin-top: 1.5rem !important; margin-bottom: 0.75rem !important; }
          .blog-content ul, .blog-content ol { margin-left: 1.5rem !important; margin-bottom: 1rem !important; }
          .blog-content blockquote { margin: 1rem 0 !important; }
          .blog-content pre { margin: 1rem 0 !important; }
          .blog-content table { margin: 1rem 0 !important; }
          .blog-content hr { margin: 2rem 0 !important; }
        `}</style>
        <div
          className="blog-content prose prose-sm sm:prose-base max-w-none
            dark:prose-invert
            prose-headings:text-foreground
            prose-p:text-foreground/80 prose-p:leading-relaxed
            prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:text-foreground
            prose-pre:border prose-pre:border-border prose-pre:bg-muted
            prose-blockquote:border-violet-500 prose-blockquote:text-muted-foreground
            prose-img:rounded-xl prose-img:border prose-img:border-border
            prose-hr:border-border
            prose-ul:text-foreground/80 prose-ol:text-foreground/80"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="mt-12 border-t border-border pt-6">
          <Button variant="ghost" onClick={() => navigate('/blog')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Voltar ao feed
          </Button>
        </div>
      </article>
    </div>
  )
}
