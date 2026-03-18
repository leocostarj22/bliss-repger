import { useEffect, useMemo, useState } from "react"
import { Pencil, Printer, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

import type { MyFormulaOrder, MyFormulaOrderStatus } from "@/types"
import { fetchMyFormulaOrderStatusesReal, fetchMyFormulaOrdersReal } from "@/services/myFormulaApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useToast } from "@/components/ui/use-toast"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function Orders() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  const [orders, setOrders] = useState<MyFormulaOrder[]>([])
  const [statuses, setStatuses] = useState<MyFormulaOrderStatus[]>([])
  const [meta, setMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 1 })

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const statusNameById = useMemo(() => {
    const map: Record<string, string> = {}
    statuses.forEach((s) => (map[s.order_status_id] = s.name))
    return map
  }, [statuses])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.order_status_id !== statusFilter) return false
      if (!q) return true
      const hay = `${o.order_id} ${o.firstname} ${o.lastname} ${o.email} ${o.telephone ?? ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [orders, search, statusFilter])

  const load = async () => {
    setLoading(true)
    try {
      if (statuses.length === 0) {
        const s = await fetchMyFormulaOrderStatusesReal()
        setStatuses(s.data || [])
      }
      const o = await fetchMyFormulaOrdersReal({
        page,
        per_page: perPage,
        search,
        status_id: statusFilter === "all" ? undefined : statusFilter,
        include_unknown: false,
        dedup: true,
      })
      setOrders(o.data || [])
      setMeta({ total: Number((o as any).meta?.total ?? 0), totalPages: Number((o as any).meta?.totalPages ?? 1) })
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar pedidos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, perPage, search, statusFilter])


  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Pedidos</h1>
            <p className="page-subtitle">Gestão de encomendas MyFormula</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} placeholder="Pesquisar por ID, cliente, email ou telefone" className="pl-9" />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v) }}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.order_status_id} value={s.order_status_id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 w-44">
          <Select value={String(perPage)} onValueChange={(v) => { setPage(1); setPerPage(Number(v)) }}>
            <SelectTrigger>
              <SelectValue placeholder={`${perPage} por página`} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} por página</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-4 text-sm font-medium text-muted-foreground">ID</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Cliente</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Situação</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Pagamento</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Aprovação</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Total</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Data</th>
                <th className="p-4 text-sm font-medium text-muted-foreground w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-40" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-28" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-28" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-9 w-28 ml-auto" /></td>
                    </tr>
                  ))
                : orders.map((o) => {
                    const statusName = statusNameById[o.order_status_id] ?? o.status?.name ?? o.order_status_id
                    const payment = o.payment_method ?? o.payment_code ?? "—"
                    const approvedVal = (o as any).approved
                    const approvedOk = approvedVal !== undefined && approvedVal !== null
                      ? Boolean(approvedVal)
                      : /aprov|aprovado|approv|complet|complete/i.test(String(statusName))
                    return (
                      <tr key={o.order_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="p-4">{o.order_id}</td>
                        <td className="p-4">
                          <div className="font-medium">{o.firstname} {o.lastname}</div>

                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-primary border-primary/30">{statusName}</span>
                        </td>
                        <td className="p-4">{payment}</td>
                        <td className="p-4">
                          <span className={"inline-flex items-center rounded-md border px-2 py-0.5 text-xs " + (approvedOk ? "text-emerald-500 border-emerald-400/30" : "text-muted-foreground border-border/60")}>
                            {approvedOk ? "Aprovado" : "Pendente"}
                          </span>
                        </td>
                        <td className="p-4">{money.format(Number(o.total ?? 0))}</td>
                        <td className="p-4">{o.date_added ? new Date(o.date_added).toLocaleString("pt-PT") : "—"}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/myformula/orders/${o.order_id}`)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { const url = new URL(`/admin/crm/myformula/orders/${o.order_id}/purchase-report`, window.location.origin); window.open(url.toString(), '_blank') }}>
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        {!loading && !orders.length && <div className="p-6 text-sm text-muted-foreground">Sem resultados.</div>}

        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)) }} />
              </PaginationItem>
              <PaginationItem>
                <span className="text-xs text-muted-foreground px-2">Página {page} de {meta.totalPages}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(meta.totalPages || 1, p + 1)) }} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

    </div>
  )
}





