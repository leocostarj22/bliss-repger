import { useEffect, useMemo, useState } from "react"
import { Beaker, Package, ShoppingCart, Users } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { fetchMyFormulaDashboard } from "@/services/myFormulaApi"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<null | {
    products_count: number
    customers_count: number
    orders_count: number
    total_revenue: number
    quizzes_count: number
    completed_quizzes: number
    top_statuses: { name: string; count: number }[]
  }>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const resp = await fetchMyFormulaDashboard()
        if (!mounted) return
        setStats(resp.data)
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
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : (stats?.products_count ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-fuchsia-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Clientes</div>
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : (stats?.customers_count ?? 0)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Pedidos</div>
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : (stats?.orders_count ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">{loading ? <Skeleton className="h-4 w-28" /> : `Total: ${money.format(stats?.total_revenue ?? 0)}`}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Quizzes</div>
            <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-16" /> : (stats?.quizzes_count ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">{loading ? <Skeleton className="h-4 w-28" /> : `Concluídos: ${stats?.completed_quizzes ?? 0}`}</div>
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
            : (stats?.top_statuses?.length ?? 0) > 0
              ? stats!.top_statuses.map((s) => (
                  <div key={`${s.name}:${s.count}`} className="rounded-lg border border-border/60 p-3">
                    <div className="text-xs text-muted-foreground">{s.name}</div>
                    <div className="text-lg font-semibold">{s.count}</div>
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