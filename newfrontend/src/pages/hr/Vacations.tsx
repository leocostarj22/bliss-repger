import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { CalendarDays, Check, Pencil, Plus, Search } from "lucide-react"

import type { Company, Employee, Vacation, VacationStatus, VacationType } from "@/types"
import { fetchCompanies, fetchEmployees, fetchVacations, updateVacation } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

const statusLabel = (s: VacationStatus) => {
  if (s === "pending") return "Pendente"
  if (s === "approved") return "Aprovado"
  if (s === "rejected") return "Rejeitado"
  return "Cancelado"
}

const vacationTypeLabel = (t: VacationType) => {
  if (t === "annual_leave" || t === "annual") return "Férias Anuais"
  if (t === "maternity_leave") return "Licença de Maternidade"
  if (t === "paternity_leave") return "Licença de Paternidade"
  if (t === "sick_leave") return "Baixa Médica"
  if (t === "marriage_leave") return "Licença de Casamento"
  if (t === "bereavement_leave") return "Licença por Luto"
  if (t === "study_leave") return "Licença para Estudos"
  if (t === "unpaid_leave") return "Licença Sem Vencimento"
  if (t === "compensatory_leave" || t === "compensatory") return "Férias Compensatórias"
  if (t === "advance_leave" || t === "advance") return "Adiantamento de Férias"
  return "Outro"
}

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-PT")
}

export default function Vacations() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | VacationStatus>("all")

  const [rows, setRows] = useState<Vacation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchVacations(), fetchEmployees(), fetchCompanies()])
      .then(([vacResp, empResp, compResp]) => {
        setRows(vacResp.data)
        setEmployees(empResp.data)
        setCompanies(compResp.data)
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar férias", variant: "destructive" })
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
      const status = (r.status ?? "pending") as VacationStatus
      if (statusFilter !== "all" && status !== statusFilter) return false

      if (!q) return true

      const employeeName = (employeeNameById.get(r.employee_id) ?? r.employee_id).toLowerCase()
      const companyName = (companyNameById.get(r.company_id) ?? "").toLowerCase()
      const period = `${r.start_date} ${r.end_date}`.toLowerCase()
      const typeLabel = vacationTypeLabel((r.vacation_type ?? "other") as VacationType).toLowerCase()
      return employeeName.includes(q) || companyName.includes(q) || period.includes(q) || typeLabel.includes(q)
    })
  }, [rows, search, statusFilter, employeeNameById, companyNameById])

  const approveQuick = async (row: Vacation) => {
    setApprovingId(row.id)
    try {
      const now = new Date().toISOString()
      await updateVacation(row.id, {
        status: "approved",
        approved_days: row.requested_days,
        approved_at: now,
        rejected_at: null,
        rejection_reason: null,
      })
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                status: "approved",
                approved_days: row.requested_days,
                approved_at: now,
                rejected_at: null,
                rejection_reason: null,
              }
            : r,
        ),
      )
      toast({ title: "Aprovado", description: "Solicitação aprovada" })
    } catch {
      toast({ title: "Erro", description: "Não foi possível aprovar a solicitação", variant: "destructive" })
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Férias</h1>
            <p className="page-subtitle">Recursos Humanos → Férias</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button asChild>
            <Link to="/hr/vacations/new">
              <Plus />
              Nova solicitação
            </Link>
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por funcionário, período, tipo…" className="max-w-lg" />
          </div>

          <div className="w-full lg:w-[220px]">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Funcionário</th>
                <th className="py-3 pr-4">Período</th>
                <th className="py-3 pr-4">Dias</th>
                <th className="py-3 pr-4">Tipo</th>
                <th className="py-3 pr-4">Empresa</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 pr-4"></th>
                <th className="py-3 pr-4"></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-14" />
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
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma solicitação encontrada
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const employeeName = employeeNameById.get(r.employee_id) ?? r.employee_id
                  const companyName = companyNameById.get(r.company_id) ?? "—"
                  const status = (r.status ?? "pending") as VacationStatus
                  const type = (r.vacation_type ?? "other") as VacationType

                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4">
                        <Link to={`/hr/vacations/${r.id}/edit`} className="font-medium hover:underline">
                          {employeeName}
                        </Link>
                      </td>
                      <td className="py-4 pr-4">
                        {fmtDate(r.start_date)} — {fmtDate(r.end_date)}
                      </td>
                      <td className="py-4 pr-4">{r.requested_days}</td>
                      <td className="py-4 pr-4">{vacationTypeLabel(type)}</td>
                      <td className="py-4 pr-4">{companyName}</td>
                      <td className="py-4 pr-4">{statusLabel(status)}</td>
                      <td className="py-4 pr-4">
                        <Button asChild type="button" size="sm" variant="outline">
                          <Link to={`/hr/vacations/${r.id}/edit`}>
                            <Pencil />
                            Editar
                          </Link>
                        </Button>
                      </td>
                      <td className="py-4 pr-4">
                        {status === "pending" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={approvingId === r.id}
                            onClick={() => approveQuick(r)}
                          >
                            <Check />
                            {approvingId === r.id ? "A aprovar…" : "Aprovar"}
                          </Button>
                        ) : null}
                      </td>
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