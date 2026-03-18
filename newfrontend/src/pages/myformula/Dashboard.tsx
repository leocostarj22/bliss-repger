import { useEffect, useMemo, useState } from "react"
import { Package, ShoppingCart, Users, Coins } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Link } from "react-router-dom"
import type { MyFormulaOrder, MyFormulaOrderStatus } from "@/types"
import { fetchMyFormulaDashboard, fetchMyFormulaOrderStatusesReal, fetchMyFormulaOrdersReal } from "@/services/myFormulaApi"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ orders: 0, revenue: 0, customers: 0, products: 0 })
  const [orders, setOrders] = useState<MyFormulaOrder[]>([])
  const [statuses, setStatuses] = useState<MyFormulaOrderStatus[]>([])
  const [meta, setMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 1 })

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => {
    let mounted = true
    const loadCounts = async () => {
      try {
        const resp = await fetchMyFormulaDashboard()
        if (!mounted) return
        setCounts({
          orders: Number(resp.data?.orders_count ?? 0),
          revenue: Number(resp.data?.total_revenue ?? 0),
          customers: Number(resp.data?.customers_count ?? 0),
          products: Number(resp.data?.products_count ?? 0),
        })
      } finally {}
    }
    loadCounts()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        if (statuses.length === 0) {
          const sts = await fetchMyFormulaOrderStatusesReal()
          if (!mounted) return
          setStatuses(sts.data || [])
        }
        const ord = await fetchMyFormulaOrdersReal({
          page,
          per_page: perPage,
          search,
          status_id: statusFilter === 'all' ? undefined : statusFilter,
          include_unknown: false,
          dedup: true,
        })
        if (!mounted) return
        setOrders(ord.data || [])
        setMeta({ total: Number((ord as any).meta?.total ?? 0), totalPages: Number((ord as any).meta?.totalPages ?? 1) })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [page, perPage, search, statusFilter])

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">MyFormula</h1>
        <p className="page-subtitle">Resumo do módulo</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground">Vendas Totais</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : counts.orders}</div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Total de pedidos realizados</div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground">Receita Total</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-24" /> : money.format(counts.revenue)}</div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Soma total dos pedidos</div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground">Clientes</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : counts.customers}</div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Total de clientes registados</div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground">Produtos</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : counts.products}</div>
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-fuchsia-400" />
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Produtos cadastrados</div>
        </div>
      </div>

      <div className="glass-card p-6 mt-4">
        <div className="text-sm font-semibold">Últimos Pedidos</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value) }}
            placeholder="Pesquisar por ID, cliente, email ou telefone"
          />
          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v) }}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.order_status_id} value={String(s.order_status_id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(perPage)} onValueChange={(v) => { setPage(1); setPerPage(Number(v)) }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n} por página</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Situação</th>
                <th className="p-3">Pagamento</th>
                <th className="p-3">Aprovação</th>
                <th className="p-3">Total</th>
                <th className="p-3">Data</th>
                <th className="p-3 w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-3" colSpan={8}><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : orders.length ? (
                orders.map((o) => {
                  const statusName = o.status?.name ?? o.order_status_id
                  const payment = o.payment_method ?? o.payment_code ?? '—'
                  const approvedVal = (o as any).approved
                  const approvedOk = approvedVal !== undefined && approvedVal !== null
                    ? Boolean(approvedVal)
                    : /aprov|aprovado|approv|complet|complete/i.test(String(statusName))
                  return (
                    <tr key={o.order_id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="p-3">{o.order_id}</td>
                      <td className="p-3">{o.firstname} {o.lastname}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-primary border-primary/30">
                          {statusName}
                        </span>
                      </td>
                      <td className="p-3">{payment}</td>
                      <td className="p-3">
                        <span className={"inline-flex items-center rounded-md border px-2 py-0.5 text-xs " + (approvedOk ? "text-emerald-500 border-emerald-400/30" : "text-muted-foreground border-border/60")}>{approvedOk ? "Aprovado" : "Pendente"}</span>
                      </td>
                      <td className="p-3">{money.format(Number(o.total ?? 0))}</td>
                      <td className="p-3">{o.date_added ? new Date(o.date_added).toLocaleString("pt-PT") : "—"}</td>
                      <td className="p-3"><Link to="/myformula/orders" className="text-primary hover:underline">Ver</Link></td>
                    </tr>
                  )
                })
              ) : (
                <tr className="border-t border-border/50">
                  <td className="p-6 text-center text-muted-foreground" colSpan={8}>Sem dados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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