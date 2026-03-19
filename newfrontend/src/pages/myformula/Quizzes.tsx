import { useEffect, useMemo, useState } from "react"
import { Eye, Search } from "lucide-react"

import type { MyFormulaQuiz } from "@/types"
import { fetchMyFormulaQuizzes, fetchMyFormulaQuizStats } from "@/services/myFormulaApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const PLAN_LABELS: Record<string, string> = {
  A: "Aumento de energia",
  B: "Fortalecer imunidade",
  C: "Melhorar cabelo, pele e unhas",
  D: "Stress e ansiedade",
  E: "Melhorar performance",
  F: "Melhorar saúde feminina",
  G: "Melhorar saúde masculina",
  H: "Melhorar digestão",
  I: "Aumentar massa muscular",
  J: "Melhorar saúde cardiovascular",
  L: "Regular sono",
  M: "Melhorar a concentração",
  N: "Limpar o organismo",
  O: "Dieta Keto",
  P: "Emagrecer",
  Q: "Regulação hormonal",
  R: "Dieta Detox",
  S: "Melhorar visão",
  T: "Aumentar libido",
  U: "Regulação do intestino",
  V: "Aumentar memória",
  X: "Saúde óssea",
  Y: "Melhorar saúde das articulações",
  Z: "Nutrição desportiva",
}

function calcAge(birthdate?: string | null) {
  if (!birthdate) return null
  const d = new Date(birthdate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}

function planFromImproveHealth(improve?: string | null) {
  const parts = String(improve ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
  return parts[0] ?? null
}

export default function Quizzes() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MyFormulaQuiz[]>([])
  const [stats, setStats] = useState<{ total: number; completed: number; notCompleted: number; rate: number }>({ total: 0, completed: 0, notCompleted: 0, rate: 0 })

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "incomplete">("all")
  const [planFilter, setPlanFilter] = useState<string>("all")

  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<MyFormulaQuiz | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = { search, status: statusFilter, plan: planFilter }
      const [list, s] = await Promise.all([
        fetchMyFormulaQuizzes(params),
        fetchMyFormulaQuizStats(params),
      ])
      setRows(Array.isArray(list.data) ? list.data : [])
      setStats({
        total: Number(s.data?.total ?? 0),
        completed: Number(s.data?.completed ?? 0),
        notCompleted: Number(s.data?.not_completed ?? 0),
        rate: Number(s.data?.completion_rate ?? 0),
      })
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Não foi possível carregar quizzes", variant: "destructive" })
      setRows([])
      setStats({ total: 0, completed: 0, notCompleted: 0, rate: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [search, statusFilter, planFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const post = r.post ?? {}
      const step = String(post.step ?? "")
      const improve = String(post.improve_health ?? "")
      const plan = planFromImproveHealth(improve)
      const completed = step === "plans"

      if (statusFilter === "completed" && !completed) return false
      if (statusFilter === "incomplete" && completed) return false
      if (planFilter !== "all" && plan !== planFilter) return false

      if (!q) return true
      const hay = `${r.quiz_id} ${String(post.name ?? "")} ${String(post.email ?? "")}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter, planFilter])

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Quizzes</h1>
            <p className="page-subtitle">Respostas dos quizzes MyFormula</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-4">
          <div className="text-sm text-muted-foreground">Total de Quizzes</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
          <div className="mt-1 text-xs text-muted-foreground">Registos filtrados</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-muted-foreground">Concluídos</div>
          <div className="mt-1 text-2xl font-semibold">{stats.completed}</div>
          <div className="mt-1 text-xs text-muted-foreground">Chegaram ao fim</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-muted-foreground">Não Finalizados</div>
          <div className="mt-1 text-2xl font-semibold">{stats.notCompleted}</div>
          <div className="mt-1 text-xs text-muted-foreground">Abandonaram a meio</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-muted-foreground">Taxa de Conclusão</div>
          <div className="mt-1 text-2xl font-semibold">{stats.rate}%</div>
          <div className="mt-1 h-1 w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className="pl-9" />
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="incomplete">Incompletos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(PLAN_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {k} — {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">ID</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Género</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Idade</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plano</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Data</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="p-4">
                        <Skeleton className="h-5 w-56" />
                        <Skeleton className="h-4 w-40 mt-2" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-44" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-28" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-36" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-9 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                : filtered.map((r) => {
                    const post = r.post ?? {}
                    const name = String(post.name ?? "—")
                    const email = String(post.email ?? "—")
                    const age = calcAge(post.birthdate ? String(post.birthdate) : null)
                    const gender = String(post.gender ?? "")
                    const improve = String(post.improve_health ?? "")
                    const plan = planFromImproveHealth(improve)
                    const step = String(post.step ?? "")
                    const completed = step === "plans"

                    const planLabel = plan ? (PLAN_LABELS[plan] ?? plan) : "—"
                    const genderLabel = gender === "male" ? "Masculino" : gender === "female" ? "Feminino" : (gender || "—")

                    return (
                      <tr key={r.quiz_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="p-4 text-sm">{r.quiz_id}</td>
                        <td className="p-4">{name}</td>
                        <td className="p-4">{email}</td>
                        <td className="p-4">{genderLabel}</td>
                        <td className="p-4">{age ?? "—"}</td>
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-info/10 text-info-foreground">
                            {planLabel}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${completed ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                            {completed ? "Concluído" : `Não finalizado (passo: ${step || "—"})`}
                          </span>
                        </td>
                        <td className="p-4">{r.date_added ? new Date(r.date_added).toLocaleString("pt-PT") : "—"}</td>
                        <td className="p-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setViewing(r)
                              setViewOpen(true)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        {!loading && !filtered.length && <div className="p-6 text-sm text-muted-foreground">Sem resultados.</div>}
      </div>

      {viewOpen && viewing && (
        <ViewModal
          quiz={viewing}
          onClose={() => {
            setViewOpen(false)
            setViewing(null)
          }}
        />
      )}
    </div>
  )
}

function ViewModal({ quiz, onClose }: { quiz: MyFormulaQuiz; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Quiz</div>
            <div className="text-sm text-muted-foreground">{quiz.quiz_id}</div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <pre className="mt-5 max-h-[70vh] overflow-auto rounded-lg border border-border/60 p-4 text-xs bg-black/20">
{JSON.stringify(quiz.post ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  )
}