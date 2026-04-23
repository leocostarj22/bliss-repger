import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Activity, CalendarPlus, Cake, Clock, Eye, Pencil, Plus, Search, Trash2, Users as UsersIcon, UserCheck, UserMinus, UserX } from "lucide-react"

import type { Company, Department, Employee, EmployeeStatus } from "@/types"
import { deleteEmployee, fetchCompanies, fetchDepartments, fetchEmployees, fetchEmployeeStats, type EmployeeStats } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

const statusLabel = (s?: EmployeeStatus | null) => {
  if (s === "active") return "Ativo"
  if (s === "inactive") return "Inativo"
  if (s === "on_leave") return "Afastado"
  if (s === "terminated") return "Cessado"
  return s ? String(s) : "—"
}

type SpecialFilter = "none" | "birthday_month" | "hired_this_month" | "near_retirement"

export default function Employees() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  const [rows, setRows] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [statsLoading, setStatsLoading] = useState(false)
  const [stats, setStats] = useState<EmployeeStats | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | EmployeeStatus>("all")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>("none")

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; count: number } | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const listAnchorRef = useRef<HTMLDivElement | null>(null)

  const focusList = () => {
    const el = listAnchorRef.current
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const onCardFilter = (next: "all" | EmployeeStatus) => {
    setStatusFilter(next)
    setSpecialFilter("none")
    focusList()
  }

  const onCardSpecial = (next: SpecialFilter) => {
    setSpecialFilter(next)
    setStatusFilter("all")
    focusList()
  }

  const onCardSoon = (title: string) => {
    focusList()
    toast({ title, description: "Filtro/relatório desta métrica será adicionado a seguir." })
  }

  const load = () => {
    setLoading(true)
    Promise.all([fetchEmployees(), fetchCompanies(), fetchDepartments()])
      .then(([emp, comps, deps]) => {
        setRows(emp.data)
        setCompanies(comps.data)
        setDepartments(deps.data)
        setSelectedIds(new Set())
      })
      .catch(() => toast({ title: "Erro", description: "Não foi possível carregar funcionários", variant: "destructive" }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [toast])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [companyFilter, departmentFilter, search, statusFilter, specialFilter])

  const companyNameById = useMemo(() => {
    return companies.reduce<Record<string, string>>((acc, c) => {
      acc[c.id] = c.name
      return acc
    }, {})
  }, [companies])

  const departmentNameById = useMemo(() => {
    return departments.reduce<Record<string, string>>((acc, d) => {
      acc[d.id] = d.name
      return acc
    }, {})
  }, [departments])

  const filteredDepartments = useMemo(() => {
    if (companyFilter === "all") return departments
    return departments.filter((d) => d.company_id === companyFilter)
  }, [companyFilter, departments])

  useEffect(() => {
    if (departmentFilter === "all") return
    if (companyFilter === "all") return
    const dep = departments.find((d) => d.id === departmentFilter)
    if (dep && dep.company_id !== companyFilter) setDepartmentFilter("all")
  }, [companyFilter, departmentFilter, departments])

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      setStatsLoading(true)
      fetchEmployeeStats({
        search,
        company_id: companyFilter === "all" ? undefined : companyFilter,
        department_id: departmentFilter === "all" ? undefined : departmentFilter,
      })
        .then((r) => {
          if (!alive) return
          setStats(r.data)
        })
        .catch(() => {
          if (!alive) return
          setStats(null)
        })
        .finally(() => {
          if (!alive) return
          setStatsLoading(false)
        })
    }, 250)

    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [companyFilter, departmentFilter, search])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    return rows.filter((r) => {
      if (companyFilter !== "all" && (r.company_id ?? "") !== companyFilter) return false
      if (departmentFilter !== "all" && (r.department_id ?? "") !== departmentFilter) return false
      if (statusFilter !== "all" && (r.status ?? "") !== statusFilter) return false

      if (specialFilter === "birthday_month") {
        if (!r.birth_date) return false
        const month = parseInt(r.birth_date.slice(5, 7), 10)
        if (month !== currentMonth) return false
      }

      if (specialFilter === "hired_this_month") {
        if (!r.hire_date) return false
        const hireMonth = parseInt(r.hire_date.slice(5, 7), 10)
        const hireYear = parseInt(r.hire_date.slice(0, 4), 10)
        if (hireMonth !== currentMonth || hireYear !== currentYear) return false
      }

      if (specialFilter === "near_retirement") {
        if (!r.birth_date) return false
        const birthYear = parseInt(r.birth_date.slice(0, 4), 10)
        const age = currentYear - birthYear
        if (age < 65) return false
      }

      if (!q) return true
      const hay = `${r.employee_code ?? ""} ${r.name ?? ""} ${r.email ?? ""} ${r.nif ?? ""} ${r.phone ?? ""} ${r.position ?? ""}`
        .toLowerCase()
        .trim()
      return hay.includes(q)
    })
  }, [companyFilter, departmentFilter, rows, search, statusFilter, specialFilter])

  const toggleSelectAll = () => {
    if (filtered.length === 0) return
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(filtered.map((r) => r.id)))
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const requestBulkDelete = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setPendingDelete({ ids, count: ids.length })
    setDeleteOpen(true)
  }

  const confirmBulkDelete = async () => {
    const p = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!p || p.ids.length === 0) return

    setBulkDeleting(true)
    try {
      const results = await Promise.allSettled(p.ids.map((id) => deleteEmployee(id)))
      const okIds = p.ids.filter((_, idx) => results[idx]?.status === "fulfilled")
      const failCount = results.filter((r) => r.status === "rejected").length

      if (okIds.length > 0) {
        const okSet = new Set(okIds)
        setRows((prev) => prev.filter((r) => !okSet.has(r.id)))
        setSelectedIds(new Set())
      }

      if (failCount === 0) {
        toast({ title: "Sucesso", description: `${p.count} funcionário(s) apagado(s)` })
      } else {
        toast({
          title: "Erro",
          description: `Foram apagados ${okIds.length} e falharam ${failCount}.`,
          variant: "destructive",
        })
      }
    } catch (e: any) {
      toast({
        title: "Erro",
        description: typeof e?.message === "string" && e.message.trim() ? e.message : "Falha ao apagar",
        variant: "destructive",
      })
      load()
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex gap-4 justify-between items-start">
          <div>
            <h1 className="page-title">Funcionários</h1>
            <p className="page-subtitle">Recursos Humanos → Funcionários</p>
            <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
          </div>

          <Button asChild>
            <Link to="/hr/employees/new">
              <Plus />
              Novo funcionário
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onCardFilter("all")}
          className="flex justify-between items-center p-5 glass-card text-left w-full transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--ring)/0.12)]"
        >
          <div>
            <div className="text-xs text-muted-foreground">Total de Funcionários</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="w-16 h-7" /> : new Intl.NumberFormat("pt-PT").format(stats?.total ?? 0)}</div>
          </div>
          <div className="flex justify-center items-center w-10 h-10 rounded-xl bg-cyan-500/10">
            <UsersIcon className="w-5 h-5 text-cyan-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onCardSoon("Funcionários Online")}
          className="flex justify-between items-center p-5 glass-card text-left w-full transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--ring)/0.12)]"
        >
          <div>
            <div className="text-xs text-muted-foreground">Funcionários Online</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="w-16 h-7" /> : new Intl.NumberFormat("pt-PT").format(stats?.online ?? 0)}</div>
          </div>
          <div className="flex justify-center items-center w-10 h-10 rounded-xl bg-emerald-500/10">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onCardSpecial("hired_this_month")}
          className={`flex justify-between items-center p-5 glass-card text-left w-full transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--ring)/0.12)]${specialFilter === "hired_this_month" ? " ring-2 ring-amber-400/60" : ""}`}
        >
          <div>
            <div className="text-xs text-muted-foreground">Contratações este Mês</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="w-16 h-7" /> : new Intl.NumberFormat("pt-PT").format(stats?.hiredThisMonth ?? 0)}</div>
          </div>
          <div className="flex justify-center items-center w-10 h-10 rounded-xl bg-amber-500/10">
            <CalendarPlus className="w-5 h-5 text-amber-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onCardSpecial("birthday_month")}
          className={`flex justify-between items-center p-5 glass-card text-left w-full transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--ring)/0.12)]${specialFilter === "birthday_month" ? " ring-2 ring-fuchsia-400/60" : ""}`}
        >
          <div>
            <div className="text-xs text-muted-foreground">Aniversariantes</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="w-16 h-7" /> : new Intl.NumberFormat("pt-PT").format(stats?.birthdaysThisMonth ?? 0)}</div>
          </div>
          <div className="flex justify-center items-center w-10 h-10 rounded-xl bg-fuchsia-500/10">
            <Cake className="w-5 h-5 text-fuchsia-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onCardFilter("active")}
          className="flex justify-between items-center p-5 glass-card text-left w-full transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--ring)/0.12)]"
        >
          <div>
            <div className="text-xs text-muted-foreground">Funcionários Ativos</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="w-16 h-7" /> : new Intl.NumberFormat("pt-PT").format(stats?.active ?? 0)}</div>
          </div>
          <div className="flex justify-center items-center w-10 h-10 rounded-xl bg-emerald-500/10">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onCardFilter("inactive")}
          className="flex justify-between items-center p-5 glass-card text-left w-full transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--ring)/0.12)]"
        >
          <div>
            <div className="text-xs text-muted-foreground">Funcionários Inativos</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="w-16 h-7" /> : new Intl.NumberFormat("pt-PT").format(stats?.inactive ?? 0)}</div>
          </div>
          <div className="flex justify-center items-center w-10 h-10 rounded-xl bg-slate-500/10">
            <UserX className="w-5 h-5 text-slate-300" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onCardFilter("on_leave")}
          className="flex justify-between items-center p-5 glass-card text-left w-full transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--ring)/0.12)]"
        >
          <div>
            <div className="text-xs text-muted-foreground">Funcionários Afastados</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="w-16 h-7" /> : new Intl.NumberFormat("pt-PT").format(stats?.onLeave ?? 0)}</div>
          </div>
          <div className="flex justify-center items-center w-10 h-10 rounded-xl bg-violet-500/10">
            <UserMinus className="w-5 h-5 text-violet-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onCardSpecial("near_retirement")}
          className={`flex justify-between items-center p-5 glass-card text-left w-full transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--ring)/0.12)]${specialFilter === "near_retirement" ? " ring-2 ring-cyan-400/60" : ""}`}
        >
          <div>
            <div className="text-xs text-muted-foreground">Próximos da Aposentadoria</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="w-16 h-7" /> : new Intl.NumberFormat("pt-PT").format(stats?.nearRetirement ?? 0)}</div>
          </div>
          <div className="flex justify-center items-center w-10 h-10 rounded-xl bg-cyan-500/10">
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>
        </button>
      </div>

      <div ref={listAnchorRef} />

      <div className="p-4 glass-card">
        <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 gap-2 items-center">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por código, nome, email, cargo…"
              className="max-w-lg"
            />
          </div>

          <div className="w-full lg:w-[220px]">
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

          <div className="w-full lg:w-[240px]">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {filteredDepartments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[200px]">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setSpecialFilter("none") }}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="on_leave">Afastado</SelectItem>
                <SelectItem value="terminated">Cessado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex justify-between items-center p-3 mb-4 rounded-lg border bg-primary/10 border-primary/20 animate-in fade-in slide-in-from-top-2">
            <div className="text-sm font-medium text-primary">{selectedIds.size} selecionado(s)</div>
            <Button size="sm" variant="destructive" onClick={requestBulkDelete} disabled={bulkDeleting} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Apagar
            </Button>
          </div>
        )}

        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-muted-foreground border-border">
                <th className="py-3 pr-3 w-10">
                  <Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} />
                </th>
                <th className="py-3 pr-4">Funcionário</th>
                <th className="py-3 pr-4">Empresa</th>
                <th className="py-3 pr-4">Departamento</th>
                <th className="py-3 pr-4">Cargo</th>
                <th className="py-3 pr-4">Telefone</th>
                <th className="py-3 pr-4">Nascimento</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-3 w-10">
                      <Skeleton className="w-5 h-5" />
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex gap-2 items-center">
                        <UsersIcon className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="w-60 h-4" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="w-40 h-4" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="w-40 h-4" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="w-28 h-4" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="w-28 h-4" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="w-16 h-4" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="w-20 h-4" />
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-2 items-center">
                        <Skeleton className="w-20 h-8" />
                        <Skeleton className="w-24 h-8" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    Nenhum funcionário encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b transition-colors border-border/60 hover:bg-white/5">
                    <td className="py-4 pr-3 w-10">
                      <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="py-4 pr-4">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.employee_code ?? "—"}</div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">{companyNameById[r.company_id ?? ""] ?? "—"}</td>
                    <td className="py-4 pr-4">{departmentNameById[r.department_id ?? ""] ?? "—"}</td>
                    <td className="py-4 pr-4">{r.position ?? "—"}</td>
                    <td className="py-4 pr-4">{r.phone ?? "—"}</td>
                    <td className="py-4 pr-4">
                      {r.birth_date ? (() => {
                        const month = parseInt(r.birth_date.slice(5, 7), 10)
                        const day = r.birth_date.slice(8, 10)
                        const isBirthdayMonth = month === new Date().getMonth() + 1
                        return (
                          <span className={isBirthdayMonth ? "inline-flex items-center gap-1 font-medium text-fuchsia-400" : ""}>
                            {isBirthdayMonth && <Cake className="w-3 h-3" />}
                            {`${day}/${String(month).padStart(2, "0")}`}
                          </span>
                        )
                      })() : "—"}
                    </td>
                    <td className="py-4 pr-4">{statusLabel(r.status)}</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-2 items-center">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/hr/employees/${r.id}`}>
                            <Eye />
                            Ver
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/hr/employees/${r.id}/edit`}>
                            <Pencil />
                            Editar
                          </Link>
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
            if (bulkDeleting) return
            setDeleteOpen(false)
            setPendingDelete(null)
          }}
        >
          <div className="p-6 w-full max-w-sm glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="text-lg font-semibold">Apagar funcionários?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja apagar ${pendingDelete.count} funcionário(s) selecionado(s)?` : "Deseja apagar os funcionários selecionados?"}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <Button
                type="button"
                variant="outline"
                disabled={bulkDeleting}
                onClick={() => {
                  setDeleteOpen(false)
                  setPendingDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="button" variant="destructive" disabled={bulkDeleting} onClick={confirmBulkDelete}>
                Apagar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}