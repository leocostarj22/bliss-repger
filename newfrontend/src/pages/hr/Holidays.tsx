import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { Holiday, HolidayScope } from "@/types"
import { createHoliday, deleteHoliday, fetchHolidays, updateHoliday } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ScopeFilter = "all" | HolidayScope

type FormState = {
  holiday_date: string
  name: string
  scope: "universal" | "portugal" | "lisbon"
  is_optional: boolean
  notes: string
}

const scopeLabel = (s: string) => {
  if (s === "universal") return "Universal"
  if (s === "portugal") return "Portugal"
  if (s === "lisbon") return "Lisboa"
  return s || "—"
}

const fmtDate = (iso: string) => {
  const raw = String(iso ?? "").trim()
  if (!raw) return "—"
  const d = new Date(`${raw}T00:00:00`)
  if (!Number.isFinite(d.getTime())) return raw
  return d.toLocaleDateString("pt-PT")
}

const emptyForm = (): FormState => ({
  holiday_date: "",
  name: "",
  scope: "portugal",
  is_optional: false,
  notes: "",
})

export default function Holidays() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<Holiday[]>([])

  const [search, setSearch] = useState("")
  const [year, setYear] = useState<string>(() => String(new Date().getFullYear()))
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Holiday | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm())

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const resp = await fetchHolidays({
        year: year.trim() || undefined,
        scope: scopeFilter === "all" ? undefined : String(scopeFilter),
      })
      setRows(resp.data)
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Não foi possível carregar feriados", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [year, scopeFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter((r) => {
      const d = String(r.holiday_date ?? "").toLowerCase()
      const name = String(r.name ?? "").toLowerCase()
      const scope = String(r.scope ?? "").toLowerCase()
      const notes = String(r.notes ?? "").toLowerCase()
      return d.includes(q) || name.includes(q) || scope.includes(q) || notes.includes(q)
    })
  }, [rows, search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (row: Holiday) => {
    setEditing(row)
    setForm({
      holiday_date: String(row.holiday_date ?? ""),
      name: String(row.name ?? ""),
      scope: (String(row.scope ?? "portugal") as any) === "universal" || (String(row.scope ?? "portugal") as any) === "lisbon"
        ? (String(row.scope) as any)
        : "portugal",
      is_optional: Boolean(row.is_optional),
      notes: String(row.notes ?? ""),
    })
    setDialogOpen(true)
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const holiday_date = form.holiday_date.trim()
    const name = form.name.trim()
    const scope = form.scope

    if (!holiday_date) {
      toast({ title: "Validação", description: "Data é obrigatória", variant: "destructive" })
      return
    }
    if (!name) {
      toast({ title: "Validação", description: "Nome é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (editing?.id) {
        const resp = await updateHoliday(editing.id, {
          holiday_date,
          name,
          scope,
          is_optional: form.is_optional,
          notes: form.notes.trim() || null,
        })
        setRows((prev) => prev.map((r) => (r.id === editing.id ? resp.data : r)))
        toast({ title: "Guardado", description: "Feriado atualizado" })
      } else {
        const resp = await createHoliday({
          holiday_date,
          name,
          scope,
          is_optional: form.is_optional,
          notes: form.notes.trim() || null,
        })
        setRows((prev) => [...prev, resp.data].sort((a, b) => String(a.holiday_date).localeCompare(String(b.holiday_date))))
        toast({ title: "Criado", description: "Feriado criado" })
      }

      setDialogOpen(false)
      setEditing(null)
      setForm(emptyForm())
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Não foi possível guardar o feriado", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const askDelete = (row: Holiday) => {
    setDeleteTarget(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const target = deleteTarget
    if (!target?.id) {
      setDeleteOpen(false)
      setDeleteTarget(null)
      return
    }

    setDeletingId(target.id)
    try {
      await deleteHoliday(target.id)
      setRows((prev) => prev.filter((r) => r.id !== target.id))
      toast({ title: "Removido", description: "Feriado removido" })
      setDeleteOpen(false)
      setDeleteTarget(null)
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Não foi possível remover o feriado", variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Feriados</h1>
            <p className="page-subtitle">Recursos Humanos → Feriados</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button type="button" onClick={openCreate}>
            <Plus />
            Novo feriado
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por data, nome, âmbito, notas…" className="max-w-lg" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-[140px]">
              <Input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="Ano" />
            </div>

            <div className="w-full sm:w-[220px]">
              <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Âmbito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="universal">Universal</SelectItem>
                  <SelectItem value="portugal">Portugal</SelectItem>
                  <SelectItem value="lisbon">Lisboa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="button" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <CalendarDays />}
              Atualizar
            </Button>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Nome</th>
                <th className="py-3 pr-4">Âmbito</th>
                <th className="py-3 pr-4">Opcional</th>
                <th className="py-3 pr-4">Notas</th>
                <th className="py-3 pr-4"></th>
                <th className="py-3 pr-4"></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-64" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 pr-4" />
                    <td className="py-4 pr-4" />
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhum feriado encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4">{fmtDate(r.holiday_date)}</td>
                    <td className="py-4 pr-4 font-medium">{r.name || "—"}</td>
                    <td className="py-4 pr-4">{scopeLabel(String(r.scope ?? ""))}</td>
                    <td className="py-4 pr-4">{r.is_optional ? "Sim" : "Não"}</td>
                    <td className="py-4 pr-4">{String(r.notes ?? "").trim() || "—"}</td>
                    <td className="py-4 pr-4">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(r)}>
                        <Pencil />
                        Editar
                      </Button>
                    </td>
                    <td className="py-4 pr-4">
                      <Button type="button" size="sm" variant="outline" onClick={() => askDelete(r)}>
                        <Trash2 />
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditing(null)
            setForm(emptyForm())
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar feriado" : "Novo feriado"}</DialogTitle>
            <DialogDescription>Os feriados serão excluídos do cálculo de dias de férias.</DialogDescription>
          </DialogHeader>

          <form onSubmit={onSave} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input type="date" value={form.holiday_date} onChange={(e) => setField("holiday_date", e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Âmbito</label>
                <Select value={form.scope} onValueChange={(v) => setField("scope", v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="universal">Universal</SelectItem>
                    <SelectItem value="portugal">Portugal</SelectItem>
                    <SelectItem value="lisbon">Lisboa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Nome</label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ex.: Natal" />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2 lg:col-span-2">
                <div>
                  <div className="text-sm font-medium">Facultativo</div>
                  <div className="text-xs text-muted-foreground">Ex.: Carnaval</div>
                </div>
                <Switch checked={form.is_optional} onCheckedChange={(v) => setField("is_optional", Boolean(v))} />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Notas</label>
                <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={3} placeholder="Opcional" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover feriado?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Isto vai remover “${deleteTarget.name}” (${fmtDate(deleteTarget.holiday_date)}).`
                : "Isto vai remover o feriado selecionado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={Boolean(deletingId)}>
              {deletingId ? "A remover…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}