import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Plus, Receipt, Search } from "lucide-react"

import type { Employee, Payroll, PayrollStatus } from "@/types"
import { fetchEmployees, fetchPayrolls } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

const statusLabel = (s: PayrollStatus) => {
  if (s === "draft") return "Rascunho"
  if (s === "approved") return "Aprovado"
  if (s === "paid") return "Pago"
  return "Cancelado"
}

const monthLabel = (m: number) =>
  (
    {
      1: "Jan",
      2: "Fev",
      3: "Mar",
      4: "Abr",
      5: "Mai",
      6: "Jun",
      7: "Jul",
      8: "Ago",
      9: "Set",
      10: "Out",
      11: "Nov",
      12: "Dez",
    } as const
  )[m as 1] ?? String(m)

export default function Payrolls() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | PayrollStatus>("all")

  const [rows, setRows] = useState<Payroll[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPayrolls(), fetchEmployees()])
      .then(([payResp, empResp]) => {
        setRows(payResp.data)
        setEmployees(empResp.data)
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar vencimentos", variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [toast])

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>()
    employees.forEach((e) => map.set(e.id, e.name))
    return map
  }, [employees])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const status = (r.status ?? "draft") as PayrollStatus
      if (statusFilter !== "all" && status !== statusFilter) return false

      if (!q) return true
      const employeeName = (employeeNameById.get(r.employee_id) ?? r.employee_id).toLowerCase()
      const period = `${monthLabel(r.reference_month)}/${r.reference_year}`.toLowerCase()
      return employeeName.includes(q) || period.includes(q)
    })
  }, [rows, search, statusFilter, employeeNameById])

  const handleGenerate = () => {
    toast({ title: "Em breve", description: "Geração/integração de vencimentos será feita via API do Laravel." })
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Vencimentos</h1>
            <p className="page-subtitle">Recursos Humanos → Vencimentos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/hr/payrolls/new">
                <Plus />
                Novo vencimento
              </Link>
            </Button>
            <Button variant="outline" onClick={handleGenerate}>
              Gerar vencimento
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por funcionário ou período…" className="max-w-lg" />
          </div>

          <div className="w-full lg:w-[220px]">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
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
                <th className="py-3 pr-4">Bruto</th>
                <th className="py-3 pr-4">Líquido</th>
                <th className="py-3 pr-4">Estado</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum vencimento encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const employeeName = employeeNameById.get(r.employee_id) ?? r.employee_id
                  const status = (r.status ?? "draft") as PayrollStatus

                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4">
                        <Link to={`/hr/payrolls/${r.id}/edit`} className="font-medium hover:underline">
                          {employeeName}
                        </Link>
                      </td>
                      <td className="py-4 pr-4">
                        {monthLabel(r.reference_month)}/{r.reference_year}
                      </td>
                      <td className="py-4 pr-4">{money.format(r.gross_total)}</td>
                      <td className="py-4 pr-4">{money.format(r.net_total)}</td>
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