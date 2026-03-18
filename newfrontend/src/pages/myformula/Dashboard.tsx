import { useEffect, useMemo, useState } from "react"
import { Beaker, Package, ShoppingCart, Users } from "lucide-react"

import type { MyFormulaCustomer, MyFormulaOrder, MyFormulaProduct, MyFormulaQuiz } from "@/types"
import { fetchMyFormulaCustomers, fetchMyFormulaOrders, fetchMyFormulaProducts, fetchMyFormulaQuizzes } from "@/services/myFormulaApi"
import { Skeleton } from "@/components/ui/skeleton"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<MyFormulaProduct[]>([])
  const [customers, setCustomers] = useState<MyFormulaCustomer[]>([])
  const [orders, setOrders] = useState<MyFormulaOrder[]>([])
  const [quizzes, setQuizzes] = useState<MyFormulaQuiz[]>([])

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0)
    const byStatus: Record<string, number> = {}
    orders.forEach((o) => {
      const key = o.status?.name ?? o.order_status_id
      byStatus[key] = (byStatus[key] ?? 0) + 1
    })

    const topStatuses = Object.entries(byStatus)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)

    const completedQuizzes = quizzes.filter((q) => String(q.post?.step ?? "") === "plans").length

    return {
      productsCount: products.length,
      customersCount: customers.length,
      ordersCount: orders.length,
      quizzesCount: quizzes.length,
      completedQuizzes,
      totalRevenue,
      topStatuses,
    }
  }, [products, customers, orders, quizzes])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const [p, c, o, q] = await Promise.all([fetchMyFormulaProducts(), fetchMyFormulaCustomers(), fetchMyFormulaOrders(), fetchMyFormulaQuizzes()])
        if (!mounted) return
        setProducts(p.data)
        setCustomers(c.data)
        setOrders(o.data)
        setQuizzes(q.data)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">MyFormula</h1>
        <p className="page-subtitle">Resumo do módulo</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Produtos</div>
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : stats.productsCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-fuchsia-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Clientes</div>
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : stats.customersCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Pedidos</div>
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : stats.ordersCount}</div>
            <div className="text-xs text-muted-foreground mt-1">{loading ? <Skeleton className="h-4 w-28" /> : `Total: ${money.format(stats.totalRevenue)}`}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Quizzes</div>
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : stats.quizzesCount}</div>
            <div className="text-xs text-muted-foreground mt-1">{loading ? <Skeleton className="h-4 w-28" /> : `Concluídos: ${stats.completedQuizzes}`}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Beaker className="w-5 h-5 text-violet-400" />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="text-sm font-semibold">Estados mais frequentes</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            : stats.topStatuses.length
              ? stats.topStatuses.map(([name, count]) => (
                  <div key={name} className="rounded-lg border border-border/60 p-3">
                    <div className="text-xs text-muted-foreground">{name}</div>
                    <div className="text-lg font-semibold">{count}</div>
                  </div>
                ))
              : (
                  <div className="text-sm text-muted-foreground">Sem dados.</div>
                )}
        </div>
      </div>
    </div>
  )
}