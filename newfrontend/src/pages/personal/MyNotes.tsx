import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Pencil, Plus, Search, Star, Trash2 } from "lucide-react"

import type { PersonalNote, User } from "@/types"
import { createPersonalNote, deletePersonalNote, fetchPersonalNotes, fetchUser, fetchUsers, updatePersonalNote } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useNavigate } from "react-router-dom"

const FAMILY_PHOTO_KEY = "bliss:personal:familyPhoto"
const CURRENT_USER_ID_KEY = "bliss:currentUserId"

const safeLocalStorageGet = (key: string) => {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeLocalStorageSet = (key: string, value: string) => {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

const safeLocalStorageRemove = (key: string) => {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

const htmlToPlainText = (value: string) => {
  const raw = String(value ?? "")
  if (!raw) return ""

  const looksLikeHtml = /<\s*[a-z][\s\S]*>/i.test(raw)
  if (!looksLikeHtml) return raw

  try {
    const normalized = raw
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*\/\s*p\s*>/gi, "\n\n")
      .replace(/<\s*\/\s*li\s*>/gi, "\n")

    const doc = new DOMParser().parseFromString(normalized, "text/html")
    return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim()
  } catch {
    return raw.replace(/<[^>]*>/g, "").trim()
  }
}

export default function MyNotes() {
  const { toast } = useToast()
  const [rows, setRows] = useState<PersonalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState("")
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "favorite" | "normal">("all")

  const navigate = useNavigate()

  const [currentUserId, setCurrentUserId] = useState("")

  useEffect(() => {
    const cached = safeLocalStorageGet(CURRENT_USER_ID_KEY)
    if (cached) setCurrentUserId(String(cached))

    fetchUser()
      .then((r) => {
        const id = String(r?.data?.id ?? "").trim()
        if (id) setCurrentUserId(id)
      })
      .catch(() => {})
  }, [])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [familyPhoto, setFamilyPhoto] = useState<string | null>(null)

  const requestSeq = useRef(0)
  const hasLoadedOnce = useRef(false)

  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    let alive = true
    fetchUsers({ is_active: true })
      .then((r) => {
        if (!alive) return
        setUsers(r.data ?? [])
      })
      .catch(() => {
        if (!alive) return
        setUsers([])
      })
    return () => {
      alive = false
    }
  }, [])

  const userById = useMemo(() => {
    const map: Record<string, User> = {}
    users.forEach((u) => {
      map[String(u.id)] = u
    })
    return map
  }, [users])

  const sharedWithLabel = useMemo(() => {
    return (ids?: string[]) => {
      const list = Array.isArray(ids) ? ids.map((v) => String(v)).filter(Boolean) : []
      if (list.length === 0) return "—"

      const names = list
        .map((id) => userById[id]?.name)
        .filter(Boolean) as string[]

      if (names.length === 0) return `${list.length} utilizador(es)`
      return names.join(", ")
    }
  }, [userById])

  const modifiedByLabel = useMemo(() => {
    return (id?: string | null) => {
      const key = String(id ?? "").trim()
      if (!key) return "—"
      return userById[key]?.name || "—"
    }
  }, [userById])

  const createdAtLabel = useMemo(() => {
    return (iso?: string | null) => {
      const raw = String(iso ?? "").trim()
      if (!raw) return "—"
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return "—"
      return d.toLocaleDateString("pt-PT")
    }
  }, [])

  useEffect(() => {
    const raw = safeLocalStorageGet(FAMILY_PHOTO_KEY)
    setFamilyPhoto(raw || null)
  }, [])

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PersonalNote | null>(null)

  const load = async (opts?: { showSkeleton?: boolean }) => {
    const seq = ++requestSeq.current
    const isInitial = !hasLoadedOnce.current
    const showSkeleton = typeof opts?.showSkeleton === "boolean" ? opts.showSkeleton : isInitial

    if (showSkeleton) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const is_favorite =
        favoriteFilter === "all" ? undefined : favoriteFilter === "favorite" ? true : false

      const resp = await fetchPersonalNotes({
        search,
        is_favorite,
      })

      if (seq !== requestSeq.current) return
      setRows(resp.data)
      hasLoadedOnce.current = true
    } catch (e: any) {
      if (seq !== requestSeq.current) return
      toast({
        title: "Erro",
        description:
          typeof e?.message === "string" && e.message.trim() ? e.message : "Falha ao carregar anotações",
        variant: "destructive",
      })
    } finally {
      if (seq !== requestSeq.current) return
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load()
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, favoriteFilter, toast])

  const openCreate = () => {
    navigate('/personal/notes/new')
  }

  const openEdit = (row: PersonalNote) => {
    navigate(`/personal/notes/${row.id}/edit`)
  }

  const onFamilyPhotoChange = (e: any) => {
    const file = e?.target?.files?.[0]
    e.target.value = ""
    if (!file) return

    const maxBytes = 2 * 1024 * 1024
    if (typeof file.size === "number" && file.size > maxBytes) {
      toast({
        title: "Erro",
        description: "A foto é muito grande. Usa uma imagem até 2MB.",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      if (!dataUrl) {
        toast({ title: "Erro", description: "Falha ao carregar a foto", variant: "destructive" })
        return
      }

      setFamilyPhoto(dataUrl)
      const ok = safeLocalStorageSet(FAMILY_PHOTO_KEY, dataUrl)
      if (!ok) {
        toast({ title: "Erro", description: "Não foi possível guardar a foto", variant: "destructive" })
      }
    }
    reader.onerror = () => {
      toast({ title: "Erro", description: "Falha ao ler a foto", variant: "destructive" })
    }
    reader.readAsDataURL(file)
  }

  const clearFamilyPhoto = () => {
    setFamilyPhoto(null)
    safeLocalStorageRemove(FAMILY_PHOTO_KEY)
  }

  const requestDelete = (row: PersonalNote) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const row = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!row) return

    try {
      await deletePersonalNote(row.id)
      toast({ title: "Sucesso", description: "Anotação eliminada" })
      load({ showSkeleton: false })
    } catch {
      toast({ title: "Erro", description: "Falha ao eliminar", variant: "destructive" })
    }
  }

  const [favoriteBusyById, setFavoriteBusyById] = useState<Record<string, boolean>>({})

  const toggleFavorite = async (row: PersonalNote) => {
    const id = String((row as any)?.id ?? "").trim()
    if (!id) return
    if (favoriteBusyById[id]) return

    const ownerId = String((row as any)?.user_id ?? "").trim()
    if (currentUserId && ownerId && ownerId !== currentUserId) {
      toast({
        title: "Sem permissão",
        description: "Só o dono da anotação pode alterar o favorito.",
        variant: "destructive",
      })
      return
    }

    const prev = Boolean((row as any)?.is_favorite)
    const next = !prev

    setFavoriteBusyById((m) => ({ ...m, [id]: true }))
    setRows((current) => current.map((n) => (String((n as any)?.id ?? "") === id ? { ...n, is_favorite: next } : n)))

    try {
      const resp = await updatePersonalNote(id, { is_favorite: next })
      setRows((current) => current.map((n) => (String((n as any)?.id ?? "") === id ? { ...n, ...(resp.data ?? {}) } : n)))

      if (favoriteFilter !== "all") {
        load({ showSkeleton: false })
      }
    } catch (e: any) {
      setRows((current) => current.map((n) => (String((n as any)?.id ?? "") === id ? { ...n, is_favorite: prev } : n)))
      const msg = typeof e?.message === "string" && e.message.trim() ? e.message : "Falha ao atualizar favorito"
      const looksLikeNotFound = /\b404\b|not\s+found|não\s+encontrad/i.test(msg)
      toast({
        title: "Erro",
        description: looksLikeNotFound ? "Anotação não encontrada ou sem permissões." : msg,
        variant: "destructive",
      })
    } finally {
      setFavoriteBusyById((m) => ({ ...m, [id]: false }))
    }
  }

  const reminderRows = rows.filter((n) => n.remind_at || n.is_favorite)

  return (
    <div className="space-y-6 animate-slide-up pb-24 md:pb-6">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Minhas Anotações</h1>
            <p className="page-subtitle">Pessoal → Minhas Anotações</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button onClick={openCreate} className="hidden md:inline-flex">
            <Plus />
            Nova anotação
          </Button>
          <Button onClick={openCreate} variant="outline" size="icon" className="md:hidden" aria-label="Nova anotação" title="Nova anotação">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-3">
        <div className="glass-card p-4 hidden md:block">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Lembretes</div>
            <div className="text-xs text-muted-foreground">Formato Post‑it</div>
          </div>

          {loading && rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              A carregar…
            </div>
          ) : reminderRows.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {reminderRows
                .slice(0, 12)
                .map((n) => (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openEdit(n)
                    }}
                    className="relative w-[160px] h-[160px] rounded-[8px] shadow-[0_10px_18px_rgba(0,0,0,0.18)] border border-black/10 rotate-[-1.2deg] hover:rotate-0 transition-transform cursor-pointer select-none overflow-hidden"
                    style={{ backgroundColor: n.color || "#FEF3C7" }}
                    title={n.title}
                  >
                    <div className="absolute inset-x-0 top-0 h-6 bg-white/20 mix-blend-overlay" />
                    <div className="absolute inset-x-0 bottom-0 h-6 bg-black/5 blur-[2px] opacity-50" />
                    <div
                      className="relative p-3 h-full"
                      style={{ fontFamily: '"Segoe Print","Bradley Hand","Comic Sans MS","Patrick Hand",cursive' }}
                    >
                      <div className="text-[13px] font-semibold leading-tight mb-1 truncate">{n.title}</div>
                      <div className="text-[13px] leading-snug opacity-90 whitespace-pre-wrap break-words line-clamp-6">
                        {htmlToPlainText(n.content)}
                      </div>
                      <div className="absolute bottom-2 right-2 text-[11px] opacity-70">
                        {n.remind_at ? new Date(n.remind_at).toLocaleString("pt-PT") : n.is_favorite ? "★" : ""}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Sem lembretes ainda
            </div>
          )}
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold">Porta-retratos</div>
              <div className="text-xs text-muted-foreground">Foto da família</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFamilyPhotoChange}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Escolher
              </Button>
              {familyPhoto ? (
                <Button type="button" variant="outline" size="sm" onClick={clearFamilyPhoto}>
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <div className="rounded-xl border-[10px] border-amber-200/60 bg-black/20 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] overflow-hidden">
              <div className="aspect-[4/5] w-full">
                {familyPhoto ? (
                  <img src={familyPhoto} alt="Foto da família" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground p-6 text-center">
                    Escolhe uma foto para aparecer aqui
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            {refreshing ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-muted-foreground" />
            )}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por título ou conteúdo…"
              className="max-w-lg"
            />
          </div>

          <div className="w-full lg:w-[220px]">
            <Select value={favoriteFilter} onValueChange={(v) => setFavoriteFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Favoritos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="favorite">Favoritas</SelectItem>
                <SelectItem value="normal">Não favoritas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="md:hidden space-y-2">
          {loading && rows.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-white/5 p-3">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhuma anotação encontrada</div>
          ) : (
            rows.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openEdit(n)
                }}
                className="rounded-xl border border-border bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="font-medium truncate">{n.title}</div>
                      {n.is_favorite ? <Star className="w-4 h-4 text-amber-400 shrink-0" /> : null}
                    </div>
                    {n.content ? (
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{htmlToPlainText(n.content)}</div>
                    ) : null}
                    <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      <div className="line-clamp-1">Favorito: {n.is_favorite ? "Sim" : "Não"}</div>
                      <div className="line-clamp-1">Partilhado com: {sharedWithLabel(n.shared_with_user_ids)}</div>
                      <div className="line-clamp-1">Modificado por: {modifiedByLabel(n.last_modified_by)}</div>
                      <div className="line-clamp-1">Data da criação: {createdAtLabel(n.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(n)
                      }}
                      aria-label={n.is_favorite ? "Remover favorito" : "Marcar como favorito"}
                      title={n.is_favorite ? "Remover favorito" : "Marcar como favorito"}
                      disabled={String(n.id ?? "").trim() === "" || Boolean(favoriteBusyById[String(n.id)])}
                    >
                      <Star
                        className={n.is_favorite ? "w-4 h-4 text-amber-400" : "w-4 h-4 text-muted-foreground"}
                        fill={n.is_favorite ? "currentColor" : "none"}
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(n)
                      }}
                      aria-label="Editar"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        requestDelete(n)
                      }}
                      aria-label="Eliminar"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Anotação</th>
                <th className="py-3 pr-4">Favorito</th>
                <th className="py-3 pr-4">Partilhado com</th>
                <th className="py-3 pr-4">Modificado por</th>
                <th className="py-3 pr-4">Data da criação</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-72" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-56" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-24 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma anotação encontrada
                  </td>
                </tr>
              ) : (
                rows.map((n) => (
                  <tr key={n.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="inline-flex items-center gap-2">
                        <div className="font-medium">{n.title}</div>
                        {n.is_favorite ? <Star className="w-4 h-4 text-amber-400" /> : null}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Switch
                        checked={Boolean(n.is_favorite)}
                        onCheckedChange={(v) => {
                          if (Boolean(v) === Boolean(n.is_favorite)) return
                          toggleFavorite(n)
                        }}
                        aria-label={
                          currentUserId && String(n.user_id ?? "").trim() && String(n.user_id ?? "").trim() !== currentUserId
                            ? "Só o dono pode alterar favorito"
                            : favoriteBusyById[String(n.id)]
                              ? "A atualizar favorito"
                              : n.is_favorite
                                ? "Remover favorito"
                                : "Marcar como favorito"
                        }
                        disabled={
                          String(n.id ?? "").trim() === "" ||
                          Boolean(favoriteBusyById[String(n.id)]) ||
                          (currentUserId && String(n.user_id ?? "").trim() && String(n.user_id ?? "").trim() !== currentUserId)
                        }
                      />
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-xs text-muted-foreground line-clamp-1">{sharedWithLabel(n.shared_with_user_ids)}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-xs text-muted-foreground line-clamp-1">{modifiedByLabel(n.last_modified_by)}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-xs text-muted-foreground">{createdAtLabel(n.createdAt)}</div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(n)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => requestDelete(n)}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-4 md:hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">Porta-retratos</div>
            <div className="text-xs text-muted-foreground">Foto da família</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFamilyPhotoChange}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Escolher
            </Button>
            {familyPhoto ? (
              <Button type="button" variant="outline" size="sm" onClick={clearFamilyPhoto}>
                <Trash2 />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-black/10 p-3">
          <div className="rounded-xl border-[10px] border-amber-200/60 bg-black/20 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="aspect-[4/5] w-full">
              {familyPhoto ? (
                <img src={familyPhoto} alt="Foto da família" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground p-6 text-center">
                  Escolhe uma foto para aparecer aqui
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setDeleteOpen(false)
            setPendingDelete(null)
          }}
        >
          <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="text-lg font-semibold">Eliminar anotação?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.title}”?` : "Deseja eliminar esta anotação?"}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteOpen(false)
                  setPendingDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}