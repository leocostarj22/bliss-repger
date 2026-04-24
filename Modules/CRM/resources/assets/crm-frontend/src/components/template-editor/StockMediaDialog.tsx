import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, ImageIcon, Video, ExternalLink, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────

interface StockPhoto {
  id: number
  alt: string
  thumb: string
  medium: string
  original: string
  author: string
  author_url: string
  pexels_url: string
}

interface StockVideo {
  id: number
  thumbnail: string
  duration: number
  author: string
  author_url: string
  video_url: string
  pexels_url: string
}

interface StockMeta {
  total: number
  page: number
  per_page: number
}

type MediaType = 'images' | 'videos'
type Orientation = 'all' | 'landscape' | 'portrait' | 'square'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: MediaType
  onSelectImage?: (url: string, alt: string) => void
  onSelectVideo?: (url: string) => void
}

// ── Storage helpers ────────────────────────────────────────

const PREFS_KEY = 'crm_stock_prefs'
const HISTORY_KEY = 'crm_stock_history'
const MAX_HISTORY = 10

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    const val = raw ? JSON.parse(raw) : null
    return val ?? fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ── API ────────────────────────────────────────────────────

async function fetchStock(
  type: MediaType,
  query: string,
  page: number,
  orientation: Orientation,
): Promise<{ data: (StockPhoto | StockVideo)[]; meta: StockMeta }> {
  const qs = new URLSearchParams({ type, q: query, page: String(page), per_page: '18' })
  if (orientation !== 'all' && type === 'images') qs.set('orientation', orientation)
  const res = await fetch(`/api/v1/email/stock?${qs}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`)
  return json
}

// ── Sub-components ─────────────────────────────────────────

function OrientationIcon({ o }: { o: Orientation }) {
  if (o === 'landscape') return <span className="inline-block w-4 h-2.5 border border-current rounded-sm align-middle" />
  if (o === 'portrait')  return <span className="inline-block w-2.5 h-4 border border-current rounded-sm align-middle" />
  if (o === 'square')    return <span className="inline-block w-3 h-3 border border-current rounded-sm align-middle" />
  return null
}

const ORIENTATION_LABELS: Record<Orientation, string> = {
  all: 'Todos',
  landscape: 'Horizontal',
  portrait: 'Vertical',
  square: 'Quadrado',
}

// ── Component ──────────────────────────────────────────────

export function StockMediaDialog({
  open,
  onOpenChange,
  defaultType = 'images',
  onSelectImage,
  onSelectVideo,
}: Props) {
  const [type, setType] = useState<MediaType>(defaultType)
  const [orientation, setOrientation] = useState<Orientation>(() =>
    lsGet<{ orientation?: Orientation }>(PREFS_KEY, {}).orientation ?? 'all'
  )
  const [query, setQuery] = useState<string>(() =>
    lsGet<{ query?: string }>(PREFS_KEY, {}).query ?? ''
  )
  const [inputValue, setInputValue] = useState<string>(() =>
    lsGet<{ query?: string }>(PREFS_KEY, {}).query ?? ''
  )
  const [history, setHistory] = useState<string[]>(() => lsGet<string[]>(HISTORY_KEY, []))
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<(StockPhoto | StockVideo)[]>([])
  const [meta, setMeta] = useState<StockMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)

  // On open: reset type to defaultType and page; restore query/orientation from localStorage on first open
  useEffect(() => {
    if (!open) return
    setType(defaultType)
    setPage(1)
    setHistory(lsGet<string[]>(HISTORY_KEY, []))

    if (!initialized.current) {
      initialized.current = true
      const prefs = lsGet<{ query?: string; orientation?: Orientation }>(PREFS_KEY, {})
      if (prefs.query) {
        setQuery(prefs.query)
        setInputValue(prefs.query)
      }
      if (prefs.orientation) setOrientation(prefs.orientation)
    }
  }, [open, defaultType])

  // Fetch when dependencies change
  useEffect(() => {
    if (!open) return
    const q = query || 'business'
    setLoading(true)
    fetchStock(type, q, page, type === 'images' ? orientation : 'all')
      .then(r => {
        setItems(r.data)
        setMeta(r.meta)
      })
      .catch(e => toast.error(e?.message ?? 'Falha ao carregar mídia.'))
      .finally(() => setLoading(false))
  }, [open, type, query, page, orientation])

  const commitSearch = (q: string) => {
    const trimmed = q.trim() || 'business'
    setPage(1)
    setQuery(trimmed)
    setShowHistory(false)
    lsSet(PREFS_KEY, { query: trimmed, orientation })

    if (trimmed && trimmed !== 'business') {
      const next = [trimmed, ...history.filter(x => x.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_HISTORY)
      setHistory(next)
      lsSet(HISTORY_KEY, next)
    }
  }

  const handleSearch = () => commitSearch(inputValue)

  const handleHistorySelect = (q: string) => {
    setInputValue(q)
    commitSearch(q)
  }

  const handleHistoryRemove = (q: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = history.filter(x => x !== q)
    setHistory(next)
    lsSet(HISTORY_KEY, next)
  }

  const handleClearHistory = () => {
    setHistory([])
    lsSet(HISTORY_KEY, [])
  }

  const handleTypeChange = (next: MediaType) => {
    setType(next)
    setPage(1)
  }

  const handleOrientationChange = (next: Orientation) => {
    setOrientation(next)
    setPage(1)
    lsSet(PREFS_KEY, { query, orientation: next })
  }

  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 1

  const handleSelectPhoto = (photo: StockPhoto) => {
    onSelectImage?.(photo.medium, photo.alt)
    onOpenChange(false)
  }

  const handleSelectVideo = (video: StockVideo) => {
    onSelectVideo?.(video.video_url)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {type === 'images'
              ? <><ImageIcon className="w-4 h-4 text-primary" /> Banco de Imagens — Pexels</>
              : <><Video className="w-4 h-4 text-primary" /> Banco de Vídeos — Pexels</>
            }
          </DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="px-5 pb-3 space-y-2.5 shrink-0 border-b border-border">
          {/* Tabs */}
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-fit">
            {(['images', 'videos'] as MediaType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'images' ? <><ImageIcon className="w-3.5 h-3.5" /> Fotos</> : <><Video className="w-3.5 h-3.5" /> Vídeos</>}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onFocus={() => setShowHistory(history.length > 0)}
                onBlur={() => setTimeout(() => setShowHistory(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSearch()
                  if (e.key === 'Escape') setShowHistory(false)
                }}
                placeholder="Pesquisar… (ex: natureza, business, city, wellness)"
                className="text-sm pr-8"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(''); inputRef.current?.focus() }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* History dropdown */}
              {showHistory && history.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-md overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" /> Pesquisas recentes
                    </span>
                    <button
                      type="button"
                      onMouseDown={handleClearHistory}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                  <ul className="max-h-48 overflow-y-auto">
                    {history.map((h) => (
                      <li key={h}>
                        <button
                          type="button"
                          onMouseDown={() => handleHistorySelect(h)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {h}
                          </span>
                          <span
                            className="shrink-0 p-0.5 rounded hover:bg-border text-muted-foreground"
                            onMouseDown={(e) => handleHistoryRemove(h, e)}
                          >
                            <X className="w-3 h-3" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Button onClick={handleSearch} disabled={loading} className="shrink-0 gap-1.5">
              <Search className="w-4 h-4" />
              Pesquisar
            </Button>
          </div>

          {/* Orientation filter (images only) */}
          {type === 'images' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Orientação:</span>
              {(['all', 'landscape', 'portrait', 'square'] as Orientation[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => handleOrientationChange(o)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    orientation === o
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  }`}
                >
                  {o !== 'all' && <OrientationIcon o={o} />}
                  {ORIENTATION_LABELS[o]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results header */}
        {meta && !loading && (
          <div className="px-5 pt-2.5 shrink-0 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {meta.total > 0
                ? `${meta.total.toLocaleString()} resultado${meta.total !== 1 ? 's' : ''} para "${query || 'business'}"`
                : `Nenhum resultado para "${query || 'business'}"`}
            </span>
            {query && query !== 'business' && (
              <button
                type="button"
                onClick={() => { setInputValue(''); commitSearch('') }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Limpar pesquisa
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-sm text-muted-foreground">
              <ImageIcon className="w-8 h-8 opacity-30" />
              Nenhum resultado encontrado.
            </div>
          ) : type === 'images' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {(items as StockPhoto[]).map(photo => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => handleSelectPhoto(photo)}
                  className="group relative rounded-lg overflow-hidden border border-border bg-muted aspect-video hover:border-primary/50 hover:shadow-md transition-all text-left"
                  title={photo.alt || 'Inserir imagem'}
                >
                  <img
                    src={photo.thumb}
                    alt={photo.alt}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-white text-[10px] truncate">{photo.author}</span>
                      <a
                        href={photo.pexels_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-white/80 hover:text-white shrink-0"
                        title="Ver no Pexels"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(items as StockVideo[]).map(video => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => handleSelectVideo(video)}
                  className="group relative rounded-lg overflow-hidden border border-border bg-muted aspect-video hover:border-primary/50 hover:shadow-md transition-all text-left"
                  title="Inserir vídeo"
                >
                  <img
                    src={video.thumbnail}
                    alt="Thumbnail"
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-white/80 group-hover:bg-white flex items-center justify-center transition-colors shadow">
                      <Video className="w-4 h-4 text-gray-800 ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-white text-[10px] truncate">{video.author}</span>
                      <span className="text-white/70 text-[10px] shrink-0">{video.duration}s</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer: attribution + pagination */}
        <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Fotos e vídeos por{' '}
            <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              Pexels
            </a>
          </p>

          {meta && meta.total > meta.per_page && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page} / {Math.min(totalPages, 50)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.min(totalPages, 50) || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
