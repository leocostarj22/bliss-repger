import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Activity, CalendarPlus, Cake, Clock, Eye, Pencil, Plus, Search, Users as UsersIcon, UserCheck, UserMinus, UserX } from "lucide-react"

import type { Company, Department, Employee, EmployeeStatus } from "@/types"
import { fetchCompanies, fetchDepartments, fetchEmployees, fetchEmployeeStats, type EmployeeStats } from "@/services/api"
import { Button } from "@/components/ui/button"
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

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchEmployees(), fetchCompanies(), fetchDepartments()])
      .then(([emp, comps, deps]) => {
        setRows(emp.data)
        setCompanies(comps.data)
        setDepartments(deps.data)
      })
      .catch(() => toast({ title: "Erro", description: "Não foi possível carregar funcionários", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [toast])

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
    return rows.filter((r) => {
      if (companyFilter !== "all" && (r.company_id ?? "") !== companyFilter) return false
      if (departmentFilter !== "all" && (r.department_id ?? "") !== departmentFilter) return false
      if (statusFilter !== "all" && (r.status ?? "") !== statusFilter) return false

      if (!q) return true
      const hay = `${r.employee_code ?? ""} ${r.name ?? ""} ${r.email ?? ""} ${r.nif ?? ""} ${r.phone ?? ""} ${r.position ?? ""}`
        .toLowerCase()
        .trim()
      return hay.includes(q)
    })
  }, [companyFilter, departmentFilter, rows, search, statusFilter])

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Funcionários</h1>
            <p className="page-subtitle">Recursos Humanos → Funcionários</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
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
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Total de Funcionários</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="h-7 w-16" /> : new Intl.NumberFormat("pt-PT").format(stats?.total ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Funcionários Online</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="h-7 w-16" /> : new Intl.NumberFormat("pt-PT").format(stats?.online ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Contratações este Mês</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="h-7 w-16" /> : new Intl.NumberFormat("pt-PT").format(stats?.hiredThisMonth ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <CalendarPlus className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Aniversariantes</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="h-7 w-16" /> : new Intl.NumberFormat("pt-PT").format(stats?.birthdaysThisMonth ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
            <Cake className="w-5 h-5 text-fuchsia-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Funcionários Ativos</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="h-7 w-16" /> : new Intl.NumberFormat("pt-PT").format(stats?.active ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Funcionários Inativos</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="h-7 w-16" /> : new Intl.NumberFormat("pt-PT").format(stats?.inactive ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
            <UserX className="w-5 h-5 text-slate-300" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Funcionários Afastados</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="h-7 w-16" /> : new Intl.NumberFormat("pt-PT").format(stats?.onLeave ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <UserMinus className="w-5 h-5 text-violet-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Próximos da Aposentadoria</div>
            <div className="text-2xl font-semibold">{loading || statsLoading ? <Skeleton className="h-7 w-16" /> : new Intl.NumberFormat("pt-PT").format(stats?.nearRetirement ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-cyan-400" />
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
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
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

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Funcionário</th>
                <th className="py-3 pr-4">Empresa</th>
                <th className="py-3 pr-4">Departamento</th>
                <th className="py-3 pr-4">Cargo</th>
                <th className="py-3 pr-4">Telefone</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-60" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhum funcionário encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
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
                    <td className="py-4 pr-4">{statusLabel(r.status)}</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
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
    </div>
  )
}