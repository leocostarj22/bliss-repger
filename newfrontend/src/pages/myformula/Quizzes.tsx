import { useEffect, useMemo, useState } from "react"
import { Eye, Search } from "lucide-react"

import type { MyFormulaQuiz } from "@/types"
import { fetchMyFormulaQuizzes } from "@/services/myFormulaApi"
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

function getPlanCodes(improve?: string | null) {
  return String(improve ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
}

function getPlanLabels(improve?: string | null) {
  const codes = getPlanCodes(improve)
  return codes.map((code) => PLAN_LABELS[code] ?? code)
}

function statusLabel(step?: string | null) {
  return step === "plans" ? "Concluído" : `Não finalizado (passo: ${step || "—"})`
}

export default function Quizzes() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MyFormulaQuiz[]>([])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "incomplete">("all")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)

  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<MyFormulaQuiz | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = { search }
      const list = await fetchMyFormulaQuizzes(params)
      const data = Array.isArray(list.data) ? list.data : []
      setRows(data)
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Não foi possível carregar quizzes", variant: "destructive" })
      setRows([])
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
      const selectedPlans = getPlanCodes(improve)
      const completed = step === "plans"

      if (statusFilter === "completed" && !completed) return false
      if (statusFilter === "incomplete" && completed) return false
      if (planFilter !== "all" && !selectedPlans.includes(planFilter)) return false

      if (!q) return true
      const hay = `${r.quiz_id} ${String(post.name ?? "")} ${String(post.email ?? "")}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter, planFilter])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const pageSafe = Math.min(page, totalPages)
  const startIdx = (pageSafe - 1) * perPage
  const endIdx = Math.min(total, startIdx + perPage)
  const paged = filtered.slice(startIdx, endIdx)

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


      <div className="glass-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} placeholder="Pesquisar..." className="pl-9" />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v as any) }}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="incomplete">Incompletos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={(v) => { setPage(1); setPlanFilter(v) }}>
            <SelectTrigger>
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(PLAN_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
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
                : paged.map((r) => {
                    const post = r.post ?? {}
                    const name = String(post.name ?? "—")
                    const email = String(post.email ?? "—")
                    const age = calcAge(post.birthdate ? String(post.birthdate) : null)
                    const gender = String(post.gender ?? "")
                    const improve = String(post.improve_health ?? "")
                    const planLabels = getPlanLabels(improve)
                    const step = String(post.step ?? "")
                    const completed = step === "plans"

                    const planLabel = planLabels.length ? planLabels.join(", ") : "—"
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
                            {statusLabel(step)}
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

      <div className="flex flex-col gap-3 border-t border-border/60 p-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {total === 0 ? 0 : startIdx + 1} to {endIdx} of {total} results
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Per page</div>
          <div className="w-24">
            <Select value={String(perPage)} onValueChange={(v) => { setPage(1); setPerPage(Number(v)) }}>
              <SelectTrigger>
                <SelectValue placeholder={String(perPage)} />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
          <div className="text-xs text-muted-foreground">Página {pageSafe} de {totalPages}</div>
          <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</Button>
        </div>
      </div>

      {viewOpen && !!viewing && (
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
  const post = quiz.post ?? {}
  const step = String(post.step ?? "")
  const plans = getPlanLabels(String(post.improve_health ?? ""))
  const entries = Object.entries(post)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-4xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Visualização do Quiz</div>
            <div className="text-sm text-muted-foreground">ID {quiz.quiz_id}</div>
          </div>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-4">
            <div className="text-sm font-medium">Cliente</div>
            <div className="mt-2 text-sm text-muted-foreground">Nome: {String(post.name ?? "—")}</div>
            <div className="text-sm text-muted-foreground">Email: {String(post.email ?? "—")}</div>
            <div className="text-sm text-muted-foreground">Telefone: {String(post.telephone ?? "—")}</div>
            <div className="text-sm text-muted-foreground">Status: {statusLabel(step)}</div>
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            <div className="text-sm font-medium">Plano selecionado</div>
            <div className="mt-2 text-sm text-muted-foreground">{plans.length ? plans.join(", ") : "Sem plano selecionado"}</div>
            <div className="mt-4 text-sm font-medium">Relatório</div>
            <div className="mt-2 text-sm text-muted-foreground">Em breve: relatório personalizado do cliente.</div>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border/60 p-4">
          <div className="text-sm font-medium">Respostas do quiz</div>
          <div className="mt-3 max-h-[45vh] overflow-auto space-y-2">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-md border border-border/40 p-2">
                <div className="text-xs text-muted-foreground">{key}</div>
                <div className="text-sm break-words">{typeof value === "string" ? value : JSON.stringify(value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}