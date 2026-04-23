import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Newspaper, Clock, Eye, Star, Loader2, Settings2, ChevronRight } from 'lucide-react'
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

const CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: 'feature',      label: 'Nova Funcionalidade', color: 'bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300 dark:border-violet-400/30' },
  { value: 'improvement',  label: 'Melhoria',            color: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300 dark:border-sky-400/30' },
  { value: 'tutorial',     label: 'Tutorial',            color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 dark:border-emerald-400/30' },
  { value: 'announcement', label: 'Anúncio',             color: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300 dark:border-amber-400/30' },
]

function categoryConfig(value: string) {
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[0]
}

function FeaturedBanner({ post }: { post: BlogPost }) {
  const navigate = useNavigate()
  const cfg = categoryConfig(post.category)

  return (
    <div
      onClick={() => navigate(`/blog/${post.slug}`)}
      className="group relative mb-10 cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-violet-500/40 hover:shadow-lg"
    >
      {post.cover_image_url && (
        <div className="relative h-64 w-full overflow-hidden sm:h-80">
          <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
      )}
      <div className={`p-6 ${post.cover_image_url ? 'absolute bottom-0 left-0 right-0' : ''}`}>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
          <Badge variant="outline" className="bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400 text-[10px]">
            <Star className="mr-1 h-2.5 w-2.5" />Destaque
          </Badge>
        </div>
        <h2 className={`text-xl font-bold transition-colors sm:text-2xl ${post.cover_image_url ? 'text-white' : 'text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400'}`}>
          {post.title}
        </h2>
        {post.summary && (
          <p className={`mt-1.5 text-sm line-clamp-2 ${post.cover_image_url ? 'text-white/80' : 'text-muted-foreground'}`}>{post.summary}</p>
        )}
        <div className={`mt-3 flex items-center gap-4 text-xs ${post.cover_image_url ? 'text-white/60' : 'text-muted-foreground'}`}>
          <span>{post.author.name}</span>
          <span>{fmtDate(post.published_at)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_time_minutes} min</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views_count}</span>
        </div>
      </div>
    </div>
  )
}

function PostCard({ post }: { post: BlogPost }) {
  const navigate = useNavigate()
  const cfg = categoryConfig(post.category)

  return (
    <div
      onClick={() => navigate(`/blog/${post.slug}`)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-border/80 hover:shadow-md"
    >
      {post.cover_image_url ? (
        <div className="h-44 overflow-hidden">
          <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center bg-muted/60">
          <Newspaper className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2">
          <Badge variant="outline" className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
        </div>
        <h3 className="flex-1 font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-violet-600 transition-colors dark:group-hover:text-violet-400">
          {post.title}
        </h3>
        {post.summary && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{post.summary}</p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span>{post.author.name}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_time_minutes} min</span>
            <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400/70">
              Ver mais <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BlogFeed() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [postsRes, access] = await Promise.all([
          apiFetch('/api/v1/blog'),
          fetchMyAccess(),
        ])
        if (postsRes.ok) { const json = await postsRes.json(); setPosts(json.data ?? []) }
        setIsAdmin(access.data.isAdmin)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const featured = posts.find(p => p.is_featured)
  const filtered = posts.filter(p =>
    activeCategory === 'all' || p.category === activeCategory
  )
  const usedCategories = Array.from(new Set(posts.map(p => p.category)))

  const tabCls = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-all ${active
      ? 'bg-violet-500/15 text-violet-700 border border-violet-500/30 dark:text-violet-300'
      : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Últimas Atualizações</h1>
          <p className="page-subtitle">Novidades, melhorias e tutoriais do GMCentral</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500" />
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/blog')} className="mt-1 flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Gerir Publicações
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A carregar publicações...</span>
        </div>
      ) : (
        <>
          {featured && activeCategory === 'all' && <FeaturedBanner post={featured} />}

          {/* Category tabs */}
          {usedCategories.length > 1 && (
            <div className="flex flex-wrap gap-2 border-b border-border pb-4">
              <button onClick={() => setActiveCategory('all')} className={tabCls(activeCategory === 'all')}>Todos</button>
              {CATEGORIES.filter(c => usedCategories.includes(c.value)).map(c => (
                <button key={c.value} onClick={() => setActiveCategory(c.value)} className={tabCls(activeCategory === c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
              <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Ainda não há publicações.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma publicação nesta categoria.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
