import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { Company, FinanceCategory } from "@/types"
import { fetchCompanies } from "@/services/api"
import {
  createFinanceCategory,
  deleteFinanceCategory,
  fetchFinanceCategories,
  updateFinanceCategory,
} from "@/services/financeApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export default function FinanceCategories() {
  const { toast } = useToast()
  const [rows, setRows] = useState<FinanceCategory[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceCategory | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<FinanceCategory | null>(null)

  const companyNameById = useMemo(() => {
    const map: Record<string, string> = {}
    companies.forEach((c) => (map[c.id] = c.name))
    return map
  }, [companies])

  const categoryNameById = useMemo(() => {
    const map: Record<string, string> = {}
    rows.forEach((c) => (map[c.id] = c.name))
    return map
  }, [rows])

  const load = async () => {
    setLoading(true)
    const is_active = activeFilter === "all" ? undefined : activeFilter === "active"
    const type = typeFilter === "all" ? undefined : typeFilter
    try {
      const [resp, comps] = await Promise.all([
        fetchFinanceCategories({
          search,
          company_id: companyFilter === "all" ? undefined : companyFilter,
          type,
          is_active,
        }),
        fetchCompanies(),
      ])
      setRows(resp.data)
      setCompanies(comps.data)
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
  }, [search, companyFilter, typeFilter, activeFilter])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (row: FinanceCategory) => {
    setEditing(row)
    setFormOpen(true)
  }

  const requestDelete = (row: FinanceCategory) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const row = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!row) return

    try {
      await deleteFinanceCategory(row.id)
      toast({ title: "Sucesso", description: "Categoria eliminada" })
      load()
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao eliminar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Categorias</h1>
            <p className="page-subtitle">Financeiro → Categorias</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button onClick={openCreate}>
            <Plus />
            Nova categoria
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome…"
              className="max-w-lg"
            />
          </div>

          <div className="w-full lg:w-[240px]">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[200px]">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[180px]">
            <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Categoria</th>
                <th className="py-3 pr-4">Empresa</th>
                <th className="py-3 pr-4">Tipo</th>
                <th className="py-3 pr-4">Pai</th>
                <th className="py-3 pr-4">Ativa</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-52" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-44" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma categoria encontrada
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: r.color ?? "#94a3b8" }}
                        />
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">{companyNameById[r.company_id] ?? r.company_id}</td>
                    <td className="py-4 pr-4">{r.type === "income" ? "Receita" : "Despesa"}</td>
                    <td className="py-4 pr-4">{r.parent_id ? categoryNameById[r.parent_id] ?? r.parent_id : "—"}</td>
                    <td className="py-4 pr-4">{r.is_active ? "Sim" : "Não"}</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                          <Pencil />
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => requestDelete(r)}>
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
        <CategoryFormModal
          companies={companies}
          rows={rows}
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
              <div className="text-lg font-semibold">Eliminar categoria?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.name}”?` : "Deseja eliminar esta categoria?"}
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

function CategoryFormModal({
  companies,
  rows,
  editing,
  onClose,
  onSaved,
}: {
  companies: Company[]
  rows: FinanceCategory[]
  editing: FinanceCategory | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [companyId, setCompanyId] = useState<string>(editing?.company_id ?? (companies[0]?.id ?? ""))
  const [type, setType] = useState<"income" | "expense">(editing?.type ?? "expense")
  const [parentId, setParentId] = useState<string>(editing?.parent_id ?? "none")
  const [name, setName] = useState(editing?.name ?? "")
  const [color, setColor] = useState(editing?.color ?? "")
  const [isActive, setIsActive] = useState(editing ? Boolean(editing.is_active) : true)

  const parentsForSelect = useMemo(() => {
    return rows.filter((c) => c.company_id === companyId && c.type === type && c.parent_id == null && c.id !== editing?.id)
  }, [rows, companyId, type, editing?.id])

  useEffect(() => {
    if (parentId !== "none") {
      const p = parentsForSelect.find((x) => x.id === parentId)
      if (!p) setParentId("none")
    }
  }, [parentsForSelect, parentId])

  const submit = async () => {
    if (!companyId) {
      toast({ title: "Erro", description: "Selecione uma empresa", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await updateFinanceCategory(editing.id, {
          company_id: companyId,
          type,
          parent_id: parentId === "none" ? null : parentId,
          name,
          color: color.trim() ? color.trim() : null,
          is_active: isActive,
        })
        toast({ title: "Sucesso", description: "Categoria atualizada" })
      } else {
        await createFinanceCategory({
          company_id: companyId,
          type,
          parent_id: parentId === "none" ? null : parentId,
          name,
          color: color.trim() ? color.trim() : null,
          is_active: isActive,
        })
        toast({ title: "Sucesso", description: "Categoria criada" })
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
      <div className="glass-card w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="text-lg font-semibold">{editing ? "Editar categoria" : "Nova categoria"}</div>
          <div className="text-sm text-muted-foreground">Estrutura e classificação</div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Empresa</div>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Tipo</div>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Ativa</div>
            <Select value={isActive ? "1" : "0"} onValueChange={(v) => setIsActive(v === "1")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Sim</SelectItem>
                <SelectItem value="0">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Nome</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Marketing" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Cor (hex)</div>
            <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#f97316" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Categoria pai</div>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem pai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem pai</SelectItem>
                {parentsForSelect.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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