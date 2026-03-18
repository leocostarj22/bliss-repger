import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Clock, Plus, Search } from "lucide-react"

import type { Company, Employee, Timesheet, TimesheetStatus } from "@/types"
import { fetchCompanies, fetchEmployees, fetchTimesheets } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

const statusLabel = (s: TimesheetStatus) => {
  if (s === "present") return "Presente"
  if (s === "absent") return "Ausente"
  if (s === "late") return "Atrasado"
  if (s === "early_leave") return "Saída Antecipada"
  if (s === "holiday") return "Feriado"
  if (s === "sick_leave") return "Licença Médica"
  return "Férias"
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-PT")

export default function Timesheets() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | TimesheetStatus>("all")

  const [rows, setRows] = useState<Timesheet[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTimesheets(), fetchEmployees(), fetchCompanies()])
      .then(([tsResp, empResp, compResp]) => {
        setRows(tsResp.data)
        setEmployees(empResp.data)
        setCompanies(compResp.data)
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar marcações", variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [toast])

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>()
    employees.forEach((e) => map.set(e.id, e.name))
    return map
  }, [employees])

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>()
    companies.forEach((c) => map.set(c.id, c.name))
    return map
  }, [companies])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const status = (r.status ?? "present") as TimesheetStatus
      if (statusFilter !== "all" && status !== statusFilter) return false

      if (!q) return true

      const employeeName = (employeeNameById.get(r.employee_id) ?? r.employee_id).toLowerCase()
      const companyName = (companyNameById.get(r.company_id) ?? "").toLowerCase()
      const date = (r.work_date ?? "").toLowerCase()
      return employeeName.includes(q) || companyName.includes(q) || date.includes(q)
    })
  }, [rows, search, statusFilter, employeeNameById, companyNameById])

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Marcação de Ponto</h1>
            <p className="page-subtitle">Recursos Humanos → Marcação de Ponto</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button asChild>
            <Link to="/hr/timesheets/new">
              <Plus />
              Novo ponto
            </Link>
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por funcionário ou data…" className="max-w-lg" />
          </div>

          <div className="w-full lg:w-[240px]">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="present">Presente</SelectItem>
                <SelectItem value="late">Atrasado</SelectItem>
                <SelectItem value="early_leave">Saída Antecipada</SelectItem>
                <SelectItem value="absent">Ausente</SelectItem>
                <SelectItem value="holiday">Feriado</SelectItem>
                <SelectItem value="sick_leave">Baixa Médica</SelectItem>
                <SelectItem value="vacation">Férias</SelectItem>
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
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Entrada</th>
                <th className="py-3 pr-4">Saída</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Extras</th>
                <th className="py-3 pr-4">Estado</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-14" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-14" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-14" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-14" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    Nenhum registo encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const employeeName = employeeNameById.get(r.employee_id) ?? r.employee_id
                  const companyName = companyNameById.get(r.company_id) ?? "—"
                  const status = (r.status ?? "present") as TimesheetStatus

                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4">
                        <Link to={`/hr/timesheets/${r.id}/edit`} className="font-medium hover:underline">
                          {employeeName}
                        </Link>
                      </td>
                      <td className="py-4 pr-4">{companyName}</td>
                      <td className="py-4 pr-4">{fmtDate(r.work_date)}</td>
                      <td className="py-4 pr-4">{r.clock_in ?? "—"}</td>
                      <td className="py-4 pr-4">{r.clock_out ?? "—"}</td>
                      <td className="py-4 pr-4">{Number(r.total_hours ?? 0).toFixed(2)}h</td>
                      <td className="py-4 pr-4">{Number(r.overtime_hours ?? 0).toFixed(2)}h</td>
                      <td className="py-4 pr-4">{statusLabel(status)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}