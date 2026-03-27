import { useEffect, useRef, useState } from "react"
import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react"

import type { PersonalNote } from "@/types"
import { createPersonalNote, deletePersonalNote, fetchPersonalNotes, updatePersonalNote } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useNavigate } from "react-router-dom"

const CURRENT_USER_KEY = "bliss:currentUserId"
const FAMILY_PHOTO_KEY = "bliss:personal:familyPhoto"

const currentUserId = () => {
  if (typeof window === "undefined") return "usr1"
  return window.localStorage.getItem(CURRENT_USER_KEY) || "usr1"
}

export default function MyNotes() {
  const { toast } = useToast()
  const [rows, setRows] = useState<PersonalNote[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "favorite" | "normal">("all")

  const navigate = useNavigate()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [familyPhoto, setFamilyPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(FAMILY_PHOTO_KEY)
      setFamilyPhoto(raw || null)
    } catch {
      setFamilyPhoto(null)
    }
  }, [])

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PersonalNote | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const is_favorite =
        favoriteFilter === "all" ? undefined : favoriteFilter === "favorite" ? true : false

      const resp = await fetchPersonalNotes({
        user_id: currentUserId(),
        search,
        is_favorite,
      })
      setRows(resp.data)
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar anotações", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load()
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, favoriteFilter])

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
      try {
        window.localStorage.setItem(FAMILY_PHOTO_KEY, dataUrl)
      } catch {
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
    try {
      window.localStorage.removeItem(FAMILY_PHOTO_KEY)
    } catch {
      return
    }
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
      load()
    } catch {
      toast({ title: "Erro", description: "Falha ao eliminar", variant: "destructive" })
    }
  }

  const reminderRows = rows.filter((n) => n.remind_at || n.is_favorite)

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Minhas Anotações</h1>
            <p className="page-subtitle">Pessoal → Minhas Anotações</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button onClick={openCreate}>
            <Plus />
            Nova anotação
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-3">
        {reminderRows.length > 0 ? (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Lembretes</div>
              <div className="text-xs text-muted-foreground">Formato Post‑it</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {reminderRows
                .slice(0, 12)
                .map((n) => (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(n)}
                    onKeyDown={(e) => { if (e.key === 'Enter') openEdit(n) }}
                    className="relative w-[160px] h-[160px] rounded-[8px] shadow-[0_10px_18px_rgba(0,0,0,0.18)] border border-black/10 rotate-[-1.2deg] hover:rotate-0 transition-transform cursor-pointer select-none overflow-hidden"
                    style={{ backgroundColor: n.color || '#FEF3C7' }}
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
                        {n.content}
                      </div>
                      <div className="absolute bottom-2 right-2 text-[11px] opacity-70">
                        {n.remind_at ? new Date(n.remind_at).toLocaleString('pt-PT') : n.is_favorite ? '★' : ''}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

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
            <Search className="w-4 h-4 text-muted-foreground" />
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

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Anotação</th>
                <th className="py-3 pr-4">Cor</th>
                <th className="py-3 pr-4">Favorita</th>
                <th className="py-3 pr-4">Atualizada</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-72" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhuma anotação encontrada
                  </td>
                </tr>
              ) : (
                rows.map((n) => (
                  <tr key={n.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{n.content}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className="inline-flex h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: n.color ?? "#94a3b8" }}
                      />
                    </td>
                    <td className="py-4 pr-4">{n.is_favorite ? <Star className="w-4 h-4 text-amber-400" /> : "—"}</td>
                    <td className="py-4 pr-4">{new Date(n.updatedAt).toLocaleString("pt-PT")}</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(n)}>
                          <Pencil />
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => requestDelete(n)}>
                          <Trash2 />
                          Eliminar
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