import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Receipt, Search } from "lucide-react"

import type { Payroll, PayrollStatus } from "@/types"
import { fetchMyEmployee, fetchPayrolls } from "@/services/api"
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

  useEffect(() => {
    let alive = true
    setLoading(true)

    fetchMyEmployee()
      .then((me) => fetchPayrolls({ employee_id: me.data.id }))
      .then((resp) => {
        if (!alive) return
        setRows(resp.data)
      })
      .catch(() => {
        if (!alive) return
        toast({ title: "Erro", description: "Não foi possível carregar holerites", variant: "destructive" })
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [toast])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const status = (r.status ?? "draft") as PayrollStatus
      if (statusFilter !== "all" && status !== statusFilter) return false

      if (!q) return true
      const period = `${monthLabel(r.reference_month)}/${r.reference_year}`.toLowerCase()
      const statusText = statusLabel(status).toLowerCase()
      return period.includes(q) || statusText.includes(q)
    })
  }, [rows, search, statusFilter])

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Meus Holerites</h1>
            <p className="page-subtitle">Meu RH → Holerites</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por período ou estado…" className="max-w-lg" />
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
                <th className="py-3 pr-4">Período</th>
                <th className="py-3 pr-4">Bruto</th>
                <th className="py-3 pr-4">Líquido</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 pr-4">PDF</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum holerite encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const status = (r.status ?? "draft") as PayrollStatus
                  const period = `${monthLabel(r.reference_month)}/${r.reference_year}`
                  const hasPdf = Boolean(String(r.pdf_path ?? "").trim())

                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4">
                        <Link to={`/me/hr/payrolls/${r.id}`} className="font-medium hover:underline">
                          {period}
                        </Link>
                      </td>
                      <td className="py-4 pr-4">{money.format(r.gross_total ?? 0)}</td>
                      <td className="py-4 pr-4">{money.format(r.net_total ?? 0)}</td>
                      <td className="py-4 pr-4">{statusLabel(status)}</td>
                      <td className="py-4 pr-4">
                        {hasPdf ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/me/hr/payrolls/${r.id}`}>Abrir</Link>
                          </Button>
                        ) : (
                          "—"
                        )}
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