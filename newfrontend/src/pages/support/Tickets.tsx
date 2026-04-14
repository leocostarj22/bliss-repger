import { useCallback, useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"

import type { Company, Department, SupportCategory, SupportTicket, SupportTicketPriority, SupportTicketStatus, User } from "@/types"
import {
  createSupportTicket,
  deleteSupportTicket,
  fetchCompanies,
  fetchDepartments,
  fetchSupportCategories,
  fetchSupportTickets,
  fetchUsers,
  updateSupportTicket,
} from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

const CURRENT_USER_KEY = "bliss:currentUserId"

const currentUserId = () => {
  if (typeof window === "undefined") return "usr1"
  return window.localStorage.getItem(CURRENT_USER_KEY) || "usr1"
}

const toLocalInput = (iso?: string | null) => (iso ? String(iso).slice(0, 16) : "")
const toIsoOrNull = (val: string) => (val ? new Date(val).toISOString() : null)

const statusLabel = (s: SupportTicketStatus) => {
  switch (s) {
    case "open":
      return "Aberto"
    case "in_progress":
      return "Em progresso"
    case "pending":
      return "Pendente"
    case "resolved":
      return "Resolvido"
    case "closed":
      return "Fechado"
  }
}

const priorityLabel = (p: SupportTicketPriority) => {
  switch (p) {
    case "low":
      return "Baixa"
    case "medium":
      return "Média"
    case "high":
      return "Alta"
    case "urgent":
      return "Urgente"
  }
}

export default function SupportTickets() {
  const { toast } = useToast()
  const [rows, setRows] = useState<SupportTicket[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<SupportCategory[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [searchParams, setSearchParams] = useSearchParams()
  const [createPrefill, setCreatePrefill] = useState<
    | {
        company_id?: string
        department_id?: string
        assigned_to?: string
      }
    | null
  >(null)

  const navigate = useNavigate()

  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | SupportTicketStatus>("all")
  const [priorityFilter, setPriorityFilter] = useState<"all" | SupportTicketPriority>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [overdueFilter, setOverdueFilter] = useState<"all" | "overdue">("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupportTicket | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<SupportTicket | null>(null)

  const companyNameById = useMemo(() => {
    const map: Record<string, string> = {}
    companies.forEach((c) => (map[c.id] = c.name))
    return map
  }, [companies])

  const deptNameById = useMemo(() => {
    const map: Record<string, string> = {}
    departments.forEach((d) => (map[d.id] = d.name))
    return map
  }, [departments])

  const catById = useMemo(() => {
    const map: Record<string, SupportCategory> = {}
    categories.forEach((c) => (map[c.id] = c))
    return map
  }, [categories])

  const userNameById = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((u) => (map[u.id] = u.name))
    return map
  }, [users])

  const categoriesForFilter = useMemo(() => {
    if (companyFilter === "all") return categories
    return categories.filter((c) => c.company_id === companyFilter)
  }, [categories, companyFilter])

  useEffect(() => {
    if (categoryFilter === "all") return
    if (companyFilter === "all") return
    if (!categoriesForFilter.some((c) => c.id === categoryFilter)) setCategoryFilter("all")
  }, [categoryFilter, categoriesForFilter, companyFilter])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ticketsResp, comps, deps, cats, us] = await Promise.all([
        fetchSupportTickets({
          search,
          company_id: companyFilter === "all" ? undefined : companyFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
          priority: priorityFilter === "all" ? undefined : priorityFilter,
          category_id: categoryFilter === "all" ? undefined : categoryFilter,
          department_id: departmentFilter === "all" ? undefined : departmentFilter,
          assigned_to: assigneeFilter === "all" ? undefined : assigneeFilter,
          overdue: overdueFilter === "overdue" ? true : undefined,
        }),
        fetchCompanies(),
        fetchDepartments(),
        fetchSupportCategories(),
        fetchUsers(),
      ])
      setRows(ticketsResp.data)
      setCompanies(comps.data)
      setDepartments(deps.data)
      setCategories(cats.data)
      setUsers(us.data)
    } finally {
      setLoading(false)
    }
  }, [assigneeFilter, categoryFilter, companyFilter, departmentFilter, overdueFilter, priorityFilter, search, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => {
      load()
    }, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    const wantNew = String(searchParams.get("new") ?? "") === "1"
    if (!wantNew) return
    if (formOpen) return
    if (companies.length === 0) return

    const assigned_to = String(searchParams.get("assigned_to") ?? "").trim()
    const assignee = assigned_to ? users.find((u) => String(u.id) === assigned_to) : null

    setEditing(null)
    setCreatePrefill({
      assigned_to: assigned_to || undefined,
      company_id: assignee?.company_id ? String(assignee.company_id) : undefined,
      department_id: assignee?.department_id ? String(assignee.department_id) : undefined,
    })

    const params = new URLSearchParams()
    if (assigned_to) params.set("assigned_to", assigned_to)
    if (assignee?.company_id) params.set("company_id", String(assignee.company_id))
    if (assignee?.department_id) params.set("department_id", String(assignee.department_id))
    navigate(`/support/tickets/new${params.toString() ? `?${params.toString()}` : ""}`)

    const next = new URLSearchParams(searchParams)
    next.delete("new")
    next.delete("assigned_to")
    setSearchParams(next, { replace: true })
  }, [companies.length, formOpen, searchParams, setSearchParams, users])

  const openCreate = () => {
    const params = new URLSearchParams()
    if (createPrefill?.assigned_to) params.set("assigned_to", String(createPrefill.assigned_to))
    if (createPrefill?.company_id) params.set("company_id", String(createPrefill.company_id))
    if (createPrefill?.department_id) params.set("department_id", String(createPrefill.department_id))
    navigate(`/support/tickets/new${params.toString() ? `?${params.toString()}` : ""}`)
  }

  const openEdit = (row: SupportTicket) => {
    setEditing(row)
    setFormOpen(true)
  }

  const requestDelete = (row: SupportTicket) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const row = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!row) return

    try {
      await deleteSupportTicket(row.id)
      toast({ title: "Sucesso", description: "Ticket eliminado" })
      load()
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao eliminar", variant: "destructive" })
    }
  }

  const hasFilters =
    Boolean(search.trim()) ||
    companyFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    categoryFilter !== "all" ||
    departmentFilter !== "all" ||
    assigneeFilter !== "all" ||
    overdueFilter !== "all"

  const clearFilters = () => {
    setSearch("")
    setCompanyFilter("all")
    setStatusFilter("all")
    setPriorityFilter("all")
    setCategoryFilter("all")
    setDepartmentFilter("all")
    setAssigneeFilter("all")
    setOverdueFilter("all")
  }

  const resultLabel = loading ? "A carregar…" : `${rows.length} ticket(s)`

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="page-title">Tickets</h1>
            <p className="page-subtitle">Suporte → Tickets</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative w-full sm:w-[380px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por título, descrição…"
                className="pl-9"
              />
            </div>

            <Button onClick={openCreate} className="sm:shrink-0">
              <Plus />
              Novo ticket
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">{resultLabel}</div>
            {hasFilters && (
              <Button type="button" variant="outline" size="sm" onClick={clearFilters} className="shrink-0">
                <X />
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="w-full">
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

            <div className="w-full">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em progresso</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>

            <div className="w-full">
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

            <div className="w-full">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categoriesForFilter.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

            <div className="w-full">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

            <div className="w-full">
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Atribuído a" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="none">Sem atribuição</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

            <div className="w-full">
            <Select value={overdueFilter} onValueChange={(v) => setOverdueFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Vencimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Ticket</th>
                <th className="py-3 pr-4">Empresa</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Prioridade</th>
                <th className="py-3 pr-4">Categoria</th>
                <th className="py-3 pr-4">Departamento</th>
                <th className="py-3 pr-4">Atribuído a</th>
                <th className="py-3 pr-4">Vence em</th>
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
                      <Skeleton className="h-4 w-44" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    Nenhum ticket encontrado
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const cat = r.category_id ? catById[r.category_id] : null
                  const due = r.due_date ? new Date(r.due_date) : null
                  const dueLabel = due && !Number.isNaN(due.getTime()) ? due.toLocaleString("pt-PT") : "—"
                  const assignedLabel = r.assigned_to ? userNameById[String(r.assigned_to)] ?? String(r.assigned_to) : "—"

                  const dueMs = due && !Number.isNaN(due.getTime()) ? due.getTime() : null
                  const overdue = Boolean(dueMs && dueMs < Date.now() && r.status !== "resolved" && r.status !== "closed")

                  const statusVariant = r.status === "resolved" || r.status === "closed" ? "secondary" : r.status === "open" ? "default" : "outline"
                  const priorityVariant = r.priority === "urgent" || r.priority === "high" ? "destructive" : "secondary"

                  return (
                    <tr
                      key={r.id}
                      className={
                        "border-b border-border/60 hover:bg-white/5 transition-colors " +
                        (overdue ? "bg-destructive/5" : "")
                      }
                    >
                      <td className="py-4 pr-4">
                        <div className="space-y-1 max-w-[520px]">
                          <div className="font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                          <div className="text-xs text-muted-foreground">{r.id}</div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">{companyNameById[r.company_id] ?? r.company_id}</td>
                      <td className="py-4 pr-4">
                        <Badge variant={statusVariant as any}>{statusLabel(r.status)}</Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant={priorityVariant as any}>{priorityLabel(r.priority)}</Badge>
                      </td>
                      <td className="py-4 pr-4">
                        {cat ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color ?? "#94a3b8" }} />
                            <span>{cat.name}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-4 pr-4">{r.department_id ? deptNameById[String(r.department_id)] ?? String(r.department_id) : "—"}</td>
                      <td className="py-4 pr-4">{assignedLabel}</td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={overdue ? "text-destructive font-medium" : ""}>{dueLabel}</span>
                          {overdue && <Badge variant="destructive">Vencido</Badge>}
                        </div>
                      </td>
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <SupportTicketFormModal
          companies={companies}
          departments={departments}
          categories={categories}
          users={users}
          editing={editing}
          prefill={createPrefill}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
            setCreatePrefill(null)
          }}
          onSaved={() => {
            setFormOpen(false)
            setEditing(null)
            setCreatePrefill(null)
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
              <div className="text-lg font-semibold">Eliminar ticket?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.title}”?` : "Deseja eliminar este ticket?"}
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

function SupportTicketFormModal({
  companies,
  departments,
  categories,
  users,
  editing,
  prefill,
  onClose,
  onSaved,
}: {
  companies: Company[]
  departments: Department[]
  categories: SupportCategory[]
  users: User[]
  editing: SupportTicket | null
  prefill?: {
    company_id?: string
    department_id?: string
    assigned_to?: string
  } | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [companyId, setCompanyId] = useState<string>(
    String(editing?.company_id ?? prefill?.company_id ?? companies[0]?.id ?? ""),
  )
  const [title, setTitle] = useState(editing?.title ?? "")
  const [description, setDescription] = useState(editing?.description ?? "")
  const [status, setStatus] = useState<SupportTicketStatus>(editing?.status ?? "open")
  const [priority, setPriority] = useState<SupportTicketPriority>(editing?.priority ?? "medium")

  const [categoryId, setCategoryId] = useState<string>(editing?.category_id ?? "none")
  const [departmentId, setDepartmentId] = useState<string>(
    String(editing?.department_id ?? prefill?.department_id ?? "none"),
  )
  const [assignedTo, setAssignedTo] = useState<string>(
    String(editing?.assigned_to ?? prefill?.assigned_to ?? "none"),
  )

  const [dueDate, setDueDate] = useState<string>(toLocalInput(editing?.due_date))
  const [resolvedAt, setResolvedAt] = useState<string>(toLocalInput(editing?.resolved_at))

  useEffect(() => {
    if (editing) return
    if (!prefill) return

    if (prefill.company_id) setCompanyId(String(prefill.company_id))
    if (prefill.department_id) setDepartmentId(String(prefill.department_id))
    if (prefill.assigned_to) setAssignedTo(String(prefill.assigned_to))
  }, [editing, prefill])

  const categoriesForCompany = useMemo(() => categories.filter((c) => c.company_id === companyId), [categories, companyId])
  const departmentsForCompany = useMemo(() => departments.filter((d) => d.company_id === companyId), [departments, companyId])

  useEffect(() => {
    if (categoryId !== "none" && !categoriesForCompany.some((c) => c.id === categoryId)) setCategoryId("none")
  }, [categoryId, categoriesForCompany])

  useEffect(() => {
    if (departmentId !== "none" && !departmentsForCompany.some((d) => d.id === departmentId)) setDepartmentId("none")
  }, [departmentId, departmentsForCompany])

  useEffect(() => {
    if (assignedTo !== "none" && !users.some((u) => u.id === assignedTo)) setAssignedTo("none")
  }, [assignedTo, users])

  useEffect(() => {
    if (status !== "resolved") setResolvedAt("")
  }, [status])

  const submit = async () => {
    if (!companyId) {
      toast({ title: "Validação", description: "Empresa é obrigatória", variant: "destructive" })
      return
    }
    if (!title.trim()) {
      toast({ title: "Validação", description: "Título é obrigatório", variant: "destructive" })
      return
    }
    if (!description.trim()) {
      toast({ title: "Validação", description: "Mensagem é obrigatória", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await updateSupportTicket(editing.id, {
          company_id: companyId,
          title,
          description,
          status,
          priority,
          category_id: categoryId === "none" ? null : categoryId,
          department_id: departmentId === "none" ? null : departmentId,
          assigned_to: assignedTo === "none" ? null : assignedTo,
          due_date: dueDate ? toIsoOrNull(dueDate) : null,
          resolved_at: status === "resolved" ? (resolvedAt ? toIsoOrNull(resolvedAt) : null) : null,
        })
        toast({ title: "Sucesso", description: "Ticket atualizado" })
      } else {
        await createSupportTicket({
          company_id: companyId,
          title,
          description,
          status,
          priority,
          category_id: categoryId === "none" ? null : categoryId,
          department_id: departmentId === "none" ? null : departmentId,
          assigned_to: assignedTo === "none" ? null : assignedTo,
          due_date: dueDate ? toIsoOrNull(dueDate) : null,
          resolved_at: status === "resolved" ? (resolvedAt ? toIsoOrNull(resolvedAt) : null) : null,
        })
        toast({ title: "Sucesso", description: "Ticket criado" })
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
      <div className="glass-card w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="text-lg font-semibold">{editing ? "Editar ticket" : "Novo ticket"}</div>
          <div className="text-sm text-muted-foreground">Registo e acompanhamento</div>
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

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Título</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Erro ao acessar" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Descreva o problema/solicitação…" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em progresso</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Prioridade</div>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Categoria</div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categoriesForCompany.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Departamento</div>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem departamento</SelectItem>
                {departmentsForCompany.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Atribuído a</div>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Sem atribuição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem atribuição</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Prazo</div>
            <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {status === "resolved" && (
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Resolvido em</div>
              <Input type="datetime-local" value={resolvedAt} onChange={(e) => setResolvedAt(e.target.value)} />
            </div>
          )}
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