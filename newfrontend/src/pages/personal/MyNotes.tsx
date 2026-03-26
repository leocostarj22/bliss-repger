import { useEffect, useState } from "react"
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

const CURRENT_USER_KEY = "bliss:currentUserId"

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

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PersonalNote | null>(null)

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
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (row: PersonalNote) => {
    setEditing(row)
    setFormOpen(true)
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

      {rows.filter((n) => n.remind_at || n.is_favorite).length > 0 ? (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Lembretes</div>
            <div className="text-xs text-muted-foreground">Formato Post‑it</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {rows
              .filter((n) => n.remind_at || n.is_favorite)
              .slice(0, 8)
              .map((n) => (
                <div
                  key={n.id}
                  className="relative p-3 rounded-lg shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-border/50 rotate-[-0.8deg] hover:rotate-0 transition-transform"
                  style={{ backgroundColor: n.color || '#FEF3C7' }}
                  title={n.title}
                >
                  <div className="text-xs font-semibold mb-1 truncate">{n.title}</div>
                  <div className="text-xs opacity-80 line-clamp-4 whitespace-pre-wrap">{n.content}</div>
                  <div className="mt-2 text-[11px] opacity-70">
                    {n.remind_at ? new Date(n.remind_at).toLocaleString('pt-PT') : n.is_favorite ? 'Favorita' : ''}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : null}

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

      {formOpen && (
        <NoteFormModal
          editing={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSaved={() => {
            setFormOpen(false)
            setEditing(null)
            load()
          }}
        />
      )}

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

function NoteFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: PersonalNote | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(editing?.title ?? "")
  const [content, setContent] = useState(editing?.content ?? "")
  const [color, setColor] = useState(editing?.color ?? "")
  const [isFavorite, setIsFavorite] = useState(editing ? Boolean(editing.is_favorite) : false)

  const submit = async () => {
    setSaving(true)
    try {
      if (editing) {
        await updatePersonalNote(editing.id, {
          title,
          content,
          color: color.trim() ? color.trim() : null,
          is_favorite: isFavorite,
          last_modified_by: currentUserId(),
        })
        toast({ title: "Sucesso", description: "Anotação atualizada" })
      } else {
        await createPersonalNote({
          user_id: currentUserId(),
          title,
          content,
          color: color.trim() ? color.trim() : null,
          is_favorite: isFavorite,
          last_modified_by: currentUserId(),
          shared_with_user_ids: [],
        })
        toast({ title: "Sucesso", description: "Anotação criada" })
      }

      onSaved()
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao guardar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="text-lg font-semibold">{editing ? "Editar anotação" : "Nova anotação"}</div>
          <div className="text-sm text-muted-foreground">Conteúdo pessoal</div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Título</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Checklist do mês" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Conteúdo</div>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escreve aqui…" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Cor</div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color || "#94a3b8"}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-12 rounded-md border border-input bg-background p-1"
                title="Escolher cor"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#RRGGBB" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <div className="text-sm font-medium">Favorita</div>
              <div className="text-xs text-muted-foreground">Controla is_favorite</div>
            </div>
            <Switch checked={isFavorite} onCheckedChange={(v) => setIsFavorite(Boolean(v))} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={saving}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}