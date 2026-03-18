import { useEffect, useMemo, useState } from "react"
import { Package, ShoppingCart, Users, Coins } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Link } from "react-router-dom"
import type { MyFormulaOrder } from "@/types"
import { fetchMyFormulaDashboard } from "@/services/myFormulaApi"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ orders: 0, revenue: 0, customers: 0, products: 0 })
  const [orders, setOrders] = useState<MyFormulaOrder[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const statuses = useMemo(() => {
    const set = new Map<string, string>()
    orders.forEach(o => {
      const id = String(o.order_status_id)
      const name = o.status?.name ?? id
      if (name.trim() && id !== "0") set.set(id, name)
    })
    return Array.from(set.entries()).map(([order_status_id, name]) => ({ order_status_id, name }))
  }, [orders])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter(o => {
      if (statusFilter !== "all" && String(o.order_status_id) !== statusFilter) return false
      if (!q) return true
      const hay = `${o.order_id} ${o.firstname} ${o.lastname} ${o.email} ${o.telephone ?? ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [orders, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentRows = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const resp = await fetchMyFormulaDashboard()
        if (!mounted) return
        setCounts({
          orders: Number(resp.data?.orders_count ?? 0),
          revenue: Number(resp.data?.total_revenue ?? 0),
          customers: Number(resp.data?.customers_count ?? 0),
          products: Number(resp.data?.products_count ?? 0),
        })
        setOrders(Array.isArray(resp.data?.latest_orders) ? resp.data.latest_orders : [])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

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
                <th className="p-3">Total</th>
                <th className="p-3">Data</th>
                <th className="p-3 w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-3" colSpan={5}><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : currentRows.length ? (
                currentRows.map((o) => (
                  <tr key={o.order_id} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="p-3">{o.order_id}</td>
                    <td className="p-3">{o.firstname} {o.lastname}</td>
                    <td className="p-3">{money.format(Number(o.total ?? 0))}</td>
                    <td className="p-3">{o.date_added ? new Date(o.date_added).toLocaleString("pt-PT") : "—"}</td>
                    <td className="p-3"><Link to="/myformula/orders" className="text-primary hover:underline">Ver</Link></td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-border/50">
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>Sem dados</td>
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
                <span className="text-xs text-muted-foreground px-2">Página {page} de {totalPages}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)) }} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}