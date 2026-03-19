import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Printer, ArrowLeft } from "lucide-react"
import type { MyFormulaOrder } from "@/types"
import { fetchMyFormulaOrder } from "@/services/myFormulaApi"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function MyFormulaOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<MyFormulaOrder | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        if (!id) return
        const res = await fetchMyFormulaOrder(id)
        if (!mounted) return
        setOrder(res.data ?? null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  const printUrl = order ? `#/myformula/orders/${order.order_id}/purchase-report` : "#"

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Pedido {order?.order_id ?? (loading ? "…" : "—")}</h1>
            <p className="page-subtitle">Detalhes do pedido</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button variant="outline" onClick={() => window.open(printUrl, "_blank")} disabled={!order}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Relatório
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : order ? (
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Cliente</div>
              <div className="font-medium">{order.firstname} {order.lastname}</div>
              <div className="text-sm text-muted-foreground">{order.email}</div>
              {order.telephone ? <div className="text-sm text-muted-foreground">{order.telephone}</div> : null}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Situação</div>
              <div className="font-medium">{order.status?.name ?? order.order_status_id}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Pagamento</div>
              <div className="font-medium">{order.payment_method ?? order.payment_code ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-medium">{money.format(Number(order.total ?? 0))}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Data</div>
              <div className="font-medium">{order.date_added ? new Date(order.date_added).toLocaleString("pt-PT") : "—"}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Pedido não encontrado.</div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 text-sm font-semibold">Itens do Pedido</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3">Produto</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Qtd</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-3" colSpan={5}><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : order?.products?.length ? (
                order.products.map((p) => (
                  <tr key={p.order_product_id} className="border-t border-border/50">
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">{p.model}</td>
                    <td className="p-3">{p.quantity}</td>
                    <td className="p-3">{money.format(Number(p.price ?? 0))}</td>
                    <td className="p-3">{money.format(Number(p.total ?? 0))}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-border/50">
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>Sem itens</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}